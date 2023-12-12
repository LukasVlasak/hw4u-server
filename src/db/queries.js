function getSelectAllQuery(db) {
    return `SELECT * from public.${db}`;
}

module.exports = getSelectAllQuery;