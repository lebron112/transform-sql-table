const readTableConfig = require('./transform-db');
let config;
try {
  config = require('./database/index');
}catch(e){
  console.error(' pleace create index.js at ./database like example.js ');
  process.exit();
}
 
const mysql = require('mysql');
const fs = require('fs');
const Path = require('path');
const { writeFile, mapLimit } = require('./util');
// const connection = mysql.createConnection(config);
const { database, username, password, host } = config;
const connection = mysql.createConnection(`mysql://${username}:${password}@${host}/${database}?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&autoReconnectForPools=true`);

connection.connect((err) => {
  if (err) {
    console.error('error connecting: ' + err.stack, config);
    return;
  }
  console.log('connected as id ' + connection.threadId);
  main();
});

const main = async () => {
  try {
    fs.statSync(Path.join(__dirname, 'sql'));
  } catch (e) {
    fs.mkdirSync(Path.join(__dirname, 'sql'));
  }
  let result = await mysqlQuery(`SELECT TABLE_NAME,TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA= '${config.database}';`);

  result = result.sort((a, b) => a.TABLE_NAME - b.TABLE_NAME);

  // 并发控制 默认20条
  await new Promise(resolve => {
    mapLimit(result, 20, async (item) => {
      const createSql = await mysqlQuery(`show create table ${item.TABLE_NAME}`);
      const sql = createSql[0]['Create Table'];
      await writeFile(`./sql/${item.TABLE_NAME}.sql`, sql);
    }, resolve);
  });
  console.log('-------sql查询完成了--------');
  await readTableConfig();
  console.log('-------执行完成-------');
  process.exit();
};

async function mysqlQuery(sql) {
  return await new Promise((reslove, reject) => {
    connection.query(sql, (error, results) => {
      error ? reject(error) : reslove(results);
    });
  });
}

