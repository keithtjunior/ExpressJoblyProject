"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filters=null) {
    const query = this.#filterAll(filters);
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies ${query ? query : ''}
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
              c.name,
              c.description,
              c.num_employees AS "numEmployees",
              c.logo_url AS "logoUrl",
              j.id, 
              j.title, 
              j.salary, 
              j.equity
          FROM companies c
          LEFT JOIN jobs j 
          ON j.company_handle = c.handle
          WHERE c.handle = $1`,
        [handle]);

    if (!companyRes.rows[0]) throw new NotFoundError(`No company: ${handle}`);

    const company = companyRes.rows.reduce((o,v,i) => {
      if (i === companyRes.rows.length-1)
        return ({
          ...o,
          handle: v.handle,
          name: v.name,
          description: v.description,
          numEmployees: v.numEmployees,
          logoUrl: v.logoUrl,
          jobs: companyRes.rows.map(j => j.id ?
            ({ id: j.id, title: j.title, salary: j.salary, equity: j.equity }) : 
              null).filter(j => j)
        });
    }, '');

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

  /** Builds the partial 'where' clauses of the sql statement to filter 
  *  all company results based on optional filtering criteria
  * 
  *  Filters can include:
  *   - name 
  *   - minEmployees
  *   - maxEmployees
  * 
  *   Returns sql statement as text if filter options are included;
  *   Returns undefined if filters are not included
  * 
  *   Throws BadRequestError if minEmployees parameter is greater 
  *   than the maxEmployees parameter
  * 
  **/

  static #filterAll(filters) {
    if (!filters) return;
    if (filters.minEmployees >= filters.maxEmployees) 
      throw new BadRequestError("instance.filters.maxEmployees must be greater than instance.filters.minEmployees");
  
    const keys = Object.keys(filters);
    const values = Object.values(filters);
  
    return keys.reduce((obj, val, idx) => {
      return obj += `${idx===0 ? '\nWHERE' : '\nAND'} ${val==='name' ? 
      `lower(name) LIKE lower('%' || '${values[idx]}' || '%')` : 
      `num_employees ${val==='minEmployees' ? `>=` : `<`} ${values[idx]}`}`
    }, '');
  }
  
}


module.exports = Company;
