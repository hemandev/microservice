const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { readFileSync } = require("fs");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const gql = require("graphql-tag");
const { Pool } = require("pg");

// Read and parse the schema
const typeDefs = gql(readFileSync("./schema.graphql", { encoding: "utf-8" }));

// Connect to the database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Sample data
const posts = [
  { id: "1", title: "Post 1", authorId: "1" },
  { id: "2", title: "Post 2", authorId: "2" },
];

// Resolvers
const resolvers = {
  Query: {
    posts: async () => {
      const res = await pool.query("SELECT * FROM posts");
      return res.rows;
    },
  },
  Mutation: {
    createPost: async (_, { title, authorId }) => {
      const res = await pool.query(
        'INSERT INTO posts (title, authorId) VALUES ($1, $2) RETURNING *',
        [title, authorId]
      );
      return res.rows[0];
    },
  },
  Post: {
    author: (post) => ({ __typename: "User", id: post.authorId }),
  },
  User: {
    posts: async (user) => {
      const res = await pool.query("SELECT * FROM posts WHERE authorId = $1", [
        user.id,
      ]);
      return res.rows;
    },
  },
};

// Apollo Server with Federation
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

// Start the server
startStandaloneServer(server, { listen: { port: 4002 } }).then(({ url }) => {
  console.log(`🚀 Post Service ready at ${url}`);
});
