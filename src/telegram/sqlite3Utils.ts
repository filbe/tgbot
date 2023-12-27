import * as sqlite3 from "sqlite3";

export interface SqlData {
  [key: string]: string | number | boolean | object;
}

type DbWrapperResult =
  | { status: "ok"; result: SqlData[] | null }
  | { status: "error"; error: Error | any };

export const dbWrapper = async (db: sqlite3.Database, sqlStatements: string) =>
  new Promise<DbWrapperResult>(async (_resolve) => {
    const resolve = (resolvant: DbWrapperResult) => {
      if (resolvant.status !== "ok") {
        console.log(resolvant);
      }
      _resolve(resolvant);
    };
    try {
      let lastResult: DbWrapperResult | undefined = undefined;
      for (const sqlStatement of sqlStatements.split(";")) {
        if (!sqlStatement.trim()) continue;
        lastResult = await new Promise<DbWrapperResult>((resolveStatement) => {
          const isRunQuery = !![
            "insert into",
            "insert or",
            "replace",
            "create",
            "alter",
            "delete",
            "drop",
            "update",
          ].find(
            (sqlCommand) =>
              sqlStatement.toLowerCase().indexOf(sqlCommand) !== -1
          );

          if (isRunQuery) {
            db.run(
              sqlStatement + ";",
              [],
              (err: Error | null, res: sqlite3.RunResult) => {
                if (err) {
                  console.log(err);
                  resolveStatement({ status: "error" as const, error: err });
                }
                resolveStatement({ status: "ok" as const, result: null });
              }
            );
          } else {
            db.all(
              sqlStatement + ";",
              [],
              (err: Error | null, res: SqlData[]) => {
                if (err) {
                  console.log(err);
                  resolveStatement({ status: "error" as const, error: err });
                }
                resolveStatement({ status: "ok" as const, result: res });
              }
            );
          }
        });
      }

      resolve(lastResult || { status: "ok" as const, result: null });
    } catch (e) {
      console.log(e);
    }
  });

export const saveToDb = async (
  db: sqlite3.Database,
  tablename: string,
  data: SqlData | SqlData[],
  where?: { [key: string]: number | string | boolean | object } | undefined
) => {
  const exists = !!where
    ? await cellFromDb(
        db,
        tablename,
        "1",
        Object.entries(where)
          .map(([whereProp, value]) => {
            let whereValueStr = "";
            switch (typeof value) {
              case "string":
                whereValueStr = "'" + value + "'";
                break;
              case "boolean":
                whereValueStr = value ? "true" : "false";
                break;
              case "object":
                whereValueStr = `\'${JSON.stringify(value)}\'`;
                break;
              case "number":
                whereValueStr = `${value}`;
                break;
            }
            return whereProp + " = " + whereValueStr;
          })
          .join(" AND ")
      )
    : false;

  if (Array.isArray(data)) {
    // multiple elements
    const insertColumns = Object.keys(data[0]);
    const insertRows = data;

    return await dbWrapper(
      db,
      `INSERT INTO ${tablename} (${insertColumns}) VALUES ${insertRows
        .map(
          (row) =>
            `(${Object.values(row).map((value) => {
              switch (typeof value) {
                case "string":
                  return `'${value}'`;
                case "boolean":
                  return value ? "true" : "false";
                case "object":
                  return `'${JSON.stringify(value)}'`;
                case "number":
                  return value;
              }
            })})`
        )
        .join(", ")})`
    );
  } else {
    if (exists) {
      return await dbWrapper(
        db,
        `UPDATE ${tablename} SET ${Object.entries(data)
          .map(([whereProp, value]) => {
            let whereValueStr = "";
            switch (value) {
              case "CURRENT_TIMESTAMP":
                whereValueStr = value;
                return `${whereProp} = ${whereValueStr}`;
            }

            switch (typeof value) {
              case "string":
                whereValueStr = "'" + value + "'";
                break;
              case "boolean":
                whereValueStr = value ? "true" : "false";
                break;
              case "object":
                whereValueStr = "'" + JSON.stringify(value) + "'";
                break;
              case "number":
                whereValueStr = value.toString();
                break;
            }

            return `${whereProp} = ${whereValueStr}`;
          })
          .join(", ")} WHERE ${Object.entries(where || {})
          .map(([whereProp, value]) => {
            let whereValueStr = "";
            switch (typeof value) {
              case "string":
                whereValueStr = "'" + value + "'";
                break;
              case "boolean":
                whereValueStr = value ? "true" : "false";
                break;
              case "object":
                whereValueStr = `'${JSON.stringify(value)}'`;
                break;
              case "number":
                whereValueStr = `${value}`;
                break;
            }
            return `${whereProp} = ${whereValueStr}`;
          })
          .join(" AND ")}`
      );
    }
    // only one element
    return await dbWrapper(
      db,
      `INSERT INTO ${tablename} (${Object.keys(data)}) VALUES (${Object.values(
        data
      ).map((value) => {
        switch (typeof value) {
          case "string":
            return `\'${value}\'`;
          case "boolean":
            return value ? "true" : "false";
          case "object":
            return `\'${JSON.stringify(value)}\'`;
          case "number":
            return `${value}`;
        }
      })})`
    );
  }
};

export const deleteFromDb = async (
  db: sqlite3.Database,
  tablename: string,
  query: SqlData
) => {
  const r = await dbWrapper(
    db,
    `
    DELETE FROM ${tablename} WHERE ${Object.keys(query)[0]} = ${
      Object.values(query).map((value) => {
        switch (typeof value) {
          case "string":
            return `\'${value}\'`;
          case "boolean":
            return value ? "true" : "false";
          case "object":
            return `\'${JSON.stringify(value)}\'`;
          case "number":
            return `${value}`;
        }
      })[0]
    }
  `
  );
  if (r.status !== "ok") {
    return [];
  }
  return r.result;
};

export const rowsFromDb = async (
  db: sqlite3.Database,
  tablename: string,
  query: SqlData | null
) => {
  const r = await dbWrapper(
    db,
    `
    SELECT * FROM ${tablename} WHERE ${
      query
        ? `${Object.keys(query)[0]} = ${
            Object.values(query).map((value) => {
              switch (typeof value) {
                case "string":
                  return `\'${value}\'`;
                case "boolean":
                  return value ? "true" : "false";
                case "object":
                  return `\'${JSON.stringify(value)}\'`;
                case "number":
                  return `${value}`;
              }
            })[0]
          }`
        : "true"
    }
  `
  );
  if (r.status !== "ok") {
    return [];
  }
  return r.result;
};

export const rowFromDb = async (
  db: sqlite3.Database,
  tablename: string,
  query: SqlData
) => {
  const row = await rowsFromDb(db, tablename, query);
  return row ? row[0] : null;
};

export const cellFromDb = async (
  db: sqlite3.Database,
  tablename: string,
  columnName: string | number | boolean,
  where?: string
) => {
  const r = await dbWrapper(
    db,
    `
      SELECT ${columnName} FROM ${tablename} WHERE ${where ? where : "true"}
    `
  );
  if (r.status !== "ok") {
    return undefined;
  }

  if (!r.result || r.result.length === 0 || typeof columnName !== "string") {
    return undefined;
  }
  return r.result[0][columnName];
};

export const colFromDb = async (
  db: sqlite3.Database,
  tablename: string,
  columnName: string,
  where?: string
) => {
  const r = await dbWrapper(
    db,
    `
      SELECT * FROM ${tablename} WHERE ${where ? where : "true"}
    `
  );
  if (r.status === "ok") {
    return r.result ? r.result.map((res) => res[columnName]) : null;
  } else {
    return null;
  }
};
