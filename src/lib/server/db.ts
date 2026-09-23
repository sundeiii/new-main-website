import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
	host: process.env.MYSQL_HOST,
	port: Number(process.env.MYSQL_PORT),
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	timezone: '+00:00'
});

// mysql2 exports format() at runtime but its promise typings leave it out.
export const formatSql = (mysql as any).format as (sql: string, values: unknown[], stringifyObjects: boolean, timeZone: string) => string;
