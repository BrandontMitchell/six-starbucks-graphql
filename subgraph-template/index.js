const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');

const { readFileSync } = require('fs');
const axios = require('axios');
const gql = require('graphql-tag');

const typeDefs = gql(readFileSync('./schema.graphql', { encoding: 'utf-8' }));
const resolvers = require('./resolvers');

async function startApolloServer() {
  const server = new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs,
      resolvers,
    }),
  });

  const port = 0; // TODO: change port number
  const subgraphName = ''; // TODO: change to subgraph name

  try {
    const { url } = await startStandaloneServer(server, {
      context: async ({ req }) => {
        const { cache } = server;

        return {
          dataSources: {
            // TODO: add data sources here
          },
        };
      },
      listen: {
        port,
      },
    });

    console.log(`🚀 Subgraph ${subgraphName} running at ${url}`);
  } catch (err) {
    console.error(err);
  }
}

startApolloServer();
