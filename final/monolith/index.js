const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require("@apollo/subgraph");
const { readFileSync } = require('fs');
const gql = require('graphql-tag');

const typeDefs = gql(readFileSync('./schema.graphql', { encoding: 'utf-8' }));
const resolvers = require('./resolvers');

const PartnerDataSource = require('./datasources/partners');

async function startApolloServer() {
  const server = new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs,
      resolvers,
    }),
  });

  const port = 4001;

  try {
    const { url } = await startStandaloneServer(server, {
      context: async ({ req }) => {
        return {
          dataSources: {
            partnersAPI: new PartnerDataSource(),
          },
        };
      },
      listen: {
        port,
      },
    });

    console.log(`🚀  Server ready at ${url}`);
  } catch (err) {
    console.error(err);
  }
}

startApolloServer();
