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

const query = async (query, params, column, cb=console.log) => {
    const results = await session.run(query, params)
    if (!column) cb(results)
    else results.records.forEach(function (row) { cb(row.get(column)) });  
}

query(insertQuery, { pairs: data }, null, async () => {
    try {
        // friends of friends query
        // friends of Joe's friends that don't know joe -> Anna
        await query(foafQuery, { name: "Joe" }, "name");

        // common friends query
        // common friends between joe and sally -> Bob
        await query(commonFriendsQuery, { name1: "Joe", name2: "Sally" }, "friend");

        // getting he shortest path from joe to billy
        await query(connectingPathsQuery, { name1: "Joe", name2: "Billy" }, "names");
        // closing the session
        await session.close()
        // closing the driver
        await driver.close()
    } catch (error) {
        console.log('error: ', error);
    }
});