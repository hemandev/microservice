const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { ApolloGateway } = require("@apollo/gateway");

// Define the services
const gateway = new ApolloGateway({
  serviceList: [
    { name: "user-service", url: "http://user-service:4001/graphql" },
    { name: "post-service", url: "http://post-service:4002/graphql" },
  ],
});

// Create the Apollo Server
const server = new ApolloServer({ gateway });

// Start the server
startStandaloneServer(server, { listen: { port: 4000 } }).then(({ url }) => {
  console.log(`🚀 Router Service (Gateway) ready at ${url}`);
});
