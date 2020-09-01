// npm install --save neo4j
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
    'bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password')
)

const session = driver.session();

const insertQuery = `
UNWIND $pairs as pair 
MERGE (p1:Person {name:pair[0]}) 
MERGE (p2:Person {name:pair[1]}) 
MERGE (p1)-[:KNOWS]-(p2)
`;

const foafQuery =`
MATCH (person:Person)-[:KNOWS]-(friend)-[:KNOWS]-(foaf) 
WHERE person.name = $name
AND NOT (person)-[:KNOWS]-(foaf) 
RETURN foaf.name AS name
`;

const commonFriendsQuery =`
MATCH (user:Person)-[:KNOWS]-(friend)-[:KNOWS]-(foaf:Person) 
WHERE user.name = $name1 AND foaf.name = $name2
RETURN friend.name AS friend
`;

const connectingPathsQuery = `
MATCH path = shortestPath((p1:Person)-[:KNOWS*..6]-(p2:Person)) 
WHERE p1.name = $name1 AND p2.name = $name2
RETURN [n IN nodes(path) | n.name] as names
`;

const data = [
    ["Jim", "Mike"], 
    ["Jim", "Billy"], 
    ["Anna", "Jim"],
    ["Anna", "Mike"], 
    ["Sally", "Anna"], 
    ["Joe", "Sally"],
    ["Joe", "Bob"], 
    ["Bob", "Sally"]
];

function query(query, params, column, cb) {
   
    return new Promise((resolve,reject)=>{
        function callback(results) {
            if (!column) cb(results)
            else results.records.forEach(function (row) { cb(row.get(column)) });
            resolve()
        };
        session.run(query, params)
            .then(callback)
            .catch(reject)
    })  
}

query(insertQuery, { pairs: data }, null, async function () {
    try {
        // friends of friends query
        await query(foafQuery, { name: "Joe" }, "name", console.log);
        // common friends query
        await query(commonFriendsQuery, { name1: "Joe", name2: "Sally" }, "friend", console.log);
        //  
        await query(connectingPathsQuery, { name1: "Joe", name2: "Billy" }, "names", (res) => console.log(res));
        await session.close()
    } catch (error) {
        console.log('error: ', error);
    }
});