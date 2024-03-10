"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// /************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 1,
    equity: 0.1,
    company_handle: "c1",
  };

  test("ok for admin", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        ...newJob, 
        id: resp.body.job.id, 
        equity: String(newJob.equity)
      }
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          equity: 0.1,
          company_handle: "c1"
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          name: "name",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon: no filters", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 0,
              equity: "0",
              companyHandle: "c1"
            }
          ],
    });
  });

  const f1 = { filters: { title: "j1" } };
  const f2 = { filters: { minSalary: 1 } };
  const f3 = { filters: { hasEquity: true } };
  const f4 = { filters: { hasEquity: false } };

  test("ok for anon: title filter", async function () {
    const resp = await request(app).get("/jobs")
      .send(f1);
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 0,
              equity: "0",
              companyHandle: "c1"
            }
          ],
    });
  });
  test("ok for anon: min salary filter", async function () {
    const resp = await request(app).get("/jobs")
      .send(f2);
    expect(resp.body).toEqual({ jobs: [] });
  });
  test("ok for anon: has equity filter (true)", async function () {
    const resp = await request(app).get("/jobs")
      .send(f3);
      expect(resp.body).toEqual({ jobs: [] });
  });
  test("ok for anon: has equity filter (false)", async function () {
    const resp = await request(app).get("/jobs")
      .send(f4);
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 0,
              equity: "0",
              companyHandle: "c1"
            }
          ],
    });
  });
  test("fails: extra filter parameters", async function () {
    const resp = await request(app).get("/companies")
      .send({ ...f1, name: "name" });
    expect(resp.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

// /************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app).get(`/jobs/${jobId}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title: "j1",
        salary: 0,
        equity: "0",
        companyHandle: "c1"
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

// /************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          title: "J1-new",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title: "J1-new",
        salary: 0,
        equity: "0",
        companyHandle: "c1"
      },
    });
  });

  test("unauth for anon", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          title: "J1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found or no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/nope`)
        .send({
          name: "new nope",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on company handle change attempt", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          company_handle: "c2",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          name: "name",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app)
        .delete(`/jobs/${jobId}`)
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({ deleted: `${jobId}` });
  });

  test("unauth for anon", async function () {
    const result = await db.query(
      `SELECT * FROM jobs`);
    const jobId = result.rows[0].id;

    const resp = await request(app)
        .delete(`/jobs/${jobId}`)
    expect(resp.statusCode).toEqual(401);
  });

  test("not found or no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/nope`)
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
