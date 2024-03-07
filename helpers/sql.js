const { BadRequestError } = require("../expressError");

/** Convert request-body keys and variable names into identifiers for
 *  an SQL statement making a partial update. Returns each with the new 
 *  values to be inserted.
 *
 * If req.body object was provided, converts the key values from each object  
 * into column identifiers for a sql statement. Key/variable names that do not 
 * match their equivalent column name are updated; ie "logoUrl" => "logo_url". 
 * The column identifiers and accompanying values are returned as a new object.
 * 
 * A BadRequestError is thrown if no req.body data is provided.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
