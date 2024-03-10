"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * */

  static async create({ title, salary, equity, company_handle }) {
    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
        [
          title,
          salary,
          equity,
          company_handle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(filters=null) {
    const query = this.#filterAll(filters);
    const sql = `SELECT id,
                    title, 
                    salary, 
                    equity, 
                    company_handle AS "companyHandle"
                FROM jobs ${query ? query : ''}
                ORDER BY title`;
    const jobsRes = await db.query(
          `SELECT id,
                  title, 
                  salary, 
                  equity, 
                  company_handle AS "companyHandle"
           FROM jobs ${query ? query : ''}
           ORDER BY title`);
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    if (isNaN(id)) throw new NotFoundError(`No job: ${id}`);
    const jobRes = await db.query(
            `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    if (isNaN(id)) throw new NotFoundError(`No job: ${id}`);
    const { setCols, values } = sqlForPartialUpdate(data, {});

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${id} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    if (isNaN(id)) throw new NotFoundError(`No job: ${id}`);
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }

/** Builds the partial 'where' clauses of the sql statement to filter 
  *  all job results based on optional filtering criteria
  * 
  *  Filters can include:
  *   - title 
  *   - minSalary
  *   - hasEquity
  * 
  *   Returns sql statement as text if filter options are included;
  *   Returns undefined if filters are not included
  * 
  **/

  static #filterAll(filters) {
    if (!filters) return;
  
    const keys = Object.keys(filters);
    const values = Object.values(filters);
  
    return keys.reduce((obj, val, idx) => {
      return obj += `${(idx===0 && values[idx]) ? '\nWHERE' : 
      `${val==='hasEquity' && !values[idx] ? '' : '\nAND' }`} ${val==='title' ? 
      `lower(title) LIKE lower('%' || '${values[idx]}' || '%')` : 
      `${val==='minSalary' ? `salary >= ${values[idx]}` : 
      `${val==='hasEquity' && values[idx] ? 'equity > 0' : ''}`}`}`
    }, '');
  }
  
}


module.exports = Job;
