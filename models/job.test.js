"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 0,
    equity: null,
    company_handle: "c2"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
        id: expect.any(Number),
        title: "new",
        salary: 0,
        equity: null,
        company_handle: "c2"
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${job.id}`);
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "new",
        salary: 0,
        equity: null,
        company_handle: "c2"
      },
    ]);
  });

});

// /************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 0,
        equity: "0.0",
        companyHandle: "c1"
      }
    ]);
  });

  const f1 = { title: "j1" };
  const f2 = { minSalary: 1 };
  const f3 = { hasEquity: true };
  const f4 = { hasEquity: false };

  test("works: with title filter", async function () {
    let jobs = await Job.findAll(f1);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 0,
        equity: "0.0",
        companyHandle: "c1"
      }
    ]);
  });
  test("works: with min salary filter", async function () {
    let jobs = await Job.findAll(f2);
    expect(jobs).toEqual([]);
  });
  test("works: with has equity filter (true)", async function () {
    let jobs = await Job.findAll(f3);
    expect(jobs).toEqual([]);
  });
  test("works: with has equity filter (false)", async function () {
    let jobs = await Job.findAll(f4);
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 0,
        equity: "0.0",
        companyHandle: "c1"
      }
    ]);
  });
});

// /************************************** get */

describe("get", function () {
  test("works", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;
    let job = await Job.get(`${jobId}`);
    expect(job).toEqual({
        id: jobId,
        title: "j1",
        salary: 0,
        equity: "0.0",
        companyHandle: "c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

// /************************************** update */

describe("update", function () {
  const updateData = {
    title: "New",
    salary: 1,
    equity: "0.1"
  };

  test("works", async function () {
    const res = await db.query(
      `SELECT * FROM jobs`);
    const jobId = res.rows[0].id;
    let job = await Job.update(jobId, updateData);
    expect(job).toEqual({
      id: jobId,
      companyHandle: "c1",
      ...updateData
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobId}`);
    expect(result.rows).toEqual([{
      id: jobId,
      title: "New",
      salary: 1,
      equity: "0.1",
      company_handle: "c1"
    }]);
  });

  test("works: null fields", async function () {
    const res = await db.query(
      `SELECT * FROM jobs`);
    const jobId = res.rows[0].id;
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null
    };

    let job = await Job.update(jobId, updateDataSetNulls);
    expect(job).toEqual({
      id: jobId,
      companyHandle: "c1",
      ...updateDataSetNulls
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = '${jobId}'`);
    expect(result.rows).toEqual([{
      id: jobId,
      title: "New",
      salary: null,
      equity: null,
      company_handle: "c1"
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    const res = await db.query(
      `SELECT * FROM jobs`);
    const jobId = res.rows[0].id;
    try {
      await Job.update(jobId, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

// /************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    await Job.remove(jobId);
    const res = await db.query(
        `SELECT id FROM jobs WHERE id='${jobId}'`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
