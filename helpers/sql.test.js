const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

const data = {
    name: "C1",
    numEmployees: 1,
    logoUrl: "http://c1.img"
}

const js = {
    numEmployees: "num_employees",
    logoUrl: "logo_url"
}

describe('returns sql indentifiers and values for partial update query', function () {
    test('works', function () {
        const keys = Object.keys(data);
        const sql = sqlForPartialUpdate(data, js);
        expect(sql).toEqual({
            setCols: `\"${keys[0]}\"=$1, \"${js.numEmployees}\"=$2, \"${js.logoUrl}\"=$3`,
            values: [data.name, data.numEmployees, data.logoUrl],
        });
    });

    test('receives no data', function () {
        try {
          const sql = sqlForPartialUpdate({}, {});
          fail();
        } catch (err) {
          expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});