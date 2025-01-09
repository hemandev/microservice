const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { readFileSync } = require("fs");
const { buildSubgraphSchema } = require("@apollo/subgraph");
const gql = require("graphql-tag");
const { Pool } = require("pg");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Read and parse the schema
const typeDefs = gql(readFileSync("./schema.graphql", { encoding: "utf-8" }));

// Load gRPC proto
const PROTO_PATH = __dirname + "/user.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Create gRPC client
const userClient = new userProto.UserService(
  process.env.USER_SERVICE_URL || "localhost:50051",
  grpc.credentials.createInsecure(),
);

// Connect to the database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
      // Verify user exists via gRPC
      return new Promise((resolve, reject) => {
        userClient.GetUser({ id: authorId }, async (err, user) => {
          if (err || !user) {
            reject(new Error("User not found"));
            return;
          }

          // If user exists, create the post
          try {
            const res = await pool.query(
              "INSERT INTO posts (title, authorId) VALUES ($1, $2) RETURNING *",
              [title, authorId],
            );
            resolve(res.rows[0]);
          } catch (dbError) {
            reject(dbError);
          }
        });
      });
    },
  },
  Post: {
    author: (post) => {
      // Use either post.authorid (lowercase from DB) or post.authorId (from GraphQL input)
      const authorId = post.authorid || post.authorId;
      return { __typename: "User", id: authorId };
    }
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
