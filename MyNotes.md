## Monolith Setup for GraphQL Workshop
This section of the workshop documentation focuses on setting up and running the initial monolithic GraphQL server, which uses static JSON files as its data store. This setup serves as the starting point for our workshop on migrating to a supergraph architecture.
### Prerequisites
Before starting, ensure you have the following installed and set up:
-  Node.js: Install the latest stable version of Node.js. Verify the installation using `node -v` to check the version.

-  Apollo Studio Account: Access to Apollo Studio (Enterprise Edition) is required, which can be accessed using Starbucks Single Sign-On (SSO). This tool will be used for testing and observing our GraphQL queries and mutations.

-  NPM Packages: Run `npm install` to install all dependencies necessary for the server to run.

### Running the Monolith

Our monolithic server uses static JSON files to simulate database interactions, simplifying the setup and focusing on GraphQL schema and resolver logic.

- Start the Server: Use `npm run start` to launch the GraphQL server. This command sets up the server on localhost:4000.

- Access GraphQL Playground: Open your web browser and visit http://localhost:4000. Here you can interact with the GraphQL API through the integrated Playground.
Supported Queries and Mutations

- Execute the following GraphQL operations to interact with the system. Examples are provided for both queries and mutations:
<details> <summary> <strong>Query 1: Get Partner By Id</strong> </summary>

```
query Partner($partnerId: ID!) {
  partner(id: $partnerId) {
    id
    email
    name
    position
  }
}
```
```
{
  "partnerId": "1"
}
```

</details> <details> <summary> <strong>Query 2: Get All Products</strong> </summary>

```
query Query {
  products {
    id
    name
    sku
    image
    price
    stock
    category
    availability
    isExclusive
  }
}
```
No variables required.
</details> <details> <summary> <strong>Mutation 1: Create Partner</strong> </summary>

```
mutation CreatePartner($partner: PartnerInput!) {
  createPartner(partner: $partner) {
    success
    message
    partner {
      id
      email
      name
      position
    }
  }
}
```

```
{
  "partner": {
    "email": "test@user.com",
    "name": "Starbucks User 3",
    "position": "Barista"
  }
}
```

</details> <details> <summary> <strong>Mutation 2: Update Product</strong> </summary>

```
mutation UpdateProduct($updateProductInput: UpdateProductInput!, $productId: ID!) {
  updateProduct(productId: $productId, updateProductInput: $updateProductInput) {
    success
    message
    product {
      id
      name
      price
      sku
      image
      category
      availability
    }
  }
}
```
```
{
  "updateProductInput": {
    "price": 5.99,
    "stock": 10
  },
  "productId": "2"
}
```

</details>


Let's go over Apollo sandbox briefly. We have the ability to:
- See our operations in the center window
- Add variables, headers, pre and post operation scripts
- View responses or query plans on the righthand side
- See documentation, save operations to our collections, env vars, etc!


## Deploying our monolith to Apollo Studio

Now that we have played around with the local apollo setup, let's create our monolith graph, which we will eventually turn into a subgraph for the new supergraph infrastructure we setup down the road!


### Setup Apollo Studio

1. Sign in to Apollo Studio: https://studio.apollographql.com/ using Starbucks SSO
2. Create a new graph 
3. Copy the `APOLLO_KEY`, `APOLLO_GRAPH_REF` to your `.env` file at the root level
4. Run the following to obtain all necessary modules to push to studio:
   
   ```npm install apollo-server apollo-server-express @apollo/federation @apollo/gateway ```

5. Install Rover CLI, which is Apollo's command-line interface for managing and maintaining graphs with GraphOS:
  
   mac: 
   ``` curl -sSL https://rover.apollo.dev/nix/latest | sh ```

   windows: 
   ``` iwr 'https://rover.apollo.dev/win/latest' | iex ```

6. Run the following, which will configure out API key and graph ref stored in the .env file for pushing via rover cli:  
  ```rover config auth```
  
7. Run the following to publish our schema: 
  
    ```rover graph publish Starbucks-Supergraph-Worksh@current --schema ./schema.graphql```


### Let's look at our schema
Taking a look at our schema, we can see how our data is made up, what types we have, and so on. 

Let's retry a query or so but this time from the deployed version of our monograph. We will first need to make sure our endpoint is configured properly!

## Creating subgraphs and migrating to Supergraph

Let's go over the implementation specifics for how to transform our large monolith into a supergraph!

First and foremost, we want to make sure that throughout this process, the web app client doesn't experience any issues and that operations continue to work as normal!

Here are the high-level steps for our migration plan:

We'll convert the monolith GraphQL server into a subgraph server, which we'll run on a different port. (Yes, it's valid for a supergraph to have just one subgraph!) This subgraph will be published to the schema registry.

We'll create a router running on the monolith's original port. The router will be connected to the schema registry and will handle all of the same queries that were previously being sent to the monolith server.

We'll start to split off small chunks of our single monolith subgraph into new, domain-specific subgraphs. This will take several steps, which we'll explain in more detail later on. Let's go over really quick some concepts:

Composition: Composition is the process of combining a set of subgraph schemas into a supergraph schema. Composition has a few rules:
1. Multiple subgraphs can't define the same field on an object type, unless that field is shareable
2. A shared field must have both a compatible return type and compatibvle argument types across each defining subgraph 
3. If multiple subgraphs define the same type, each field of that type must be resolvable by every valid GraphQL operation that includes it


### Terminology:

Composition: Composition is the process of combining a set of subgraph schemas into a supergraph schema. Composition has a few rules:
1. Multiple subgraphs can't define the same field on an object type, unless that field is shareable
2. A shared field must have both a compatible return type and compatibvle argument types across each defining subgraph 
3. If multiple subgraphs define the same type, each field of that type must be resolvable by every valid GraphQL operation that includes it

Entity: An object type that can resolve its fields across multiple subgraphs. Each subgraph can contribute different fields to the entity and is responsible for resolving only the fields that it contributes. 
An entity's `@key` must not include:
1. Fields that return a union or interface
2. Fields that take arguments



### Prerequisites

`npm install @apollo/subgraph`

Then to make this server a subgraph, we'll need to import the buildSubgraphSchema method from the @apollo/subgraph package. Add the following line to the imports in your index.js file:

  ```const { buildSubgraphSchema } = require("@apollo/subgraph");```

To continue to convert this server into a subgraph, let's define a schema property in the constructor instead. We'll use the buildSubgraphSchema method, passing it an object that contains the typeDefs and resolvers.

```
const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
});
```

While we're here, let's also set our server to listen on port 4001 (a different port from where it was originally running!). We want the monolith subgraph to use a different port because, as we outlined in our migration plan, we'll set up the router to take over port 4000. This way, the client doesn't need to make any changes to communicate with the GraphQL server.

Set up the server's listen function to run on port 4001.

```  const port = 4001; ``` (line 19)


To the monolith schema, add the following to the top. This allows us to specify directives, which are an annotation for a schema or operation that customizes request execution. Prefixed with @ and may include arguments.
```
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.5",
        import: ["@key"])
```

Once we have this, we can verify our initial setup is complete by running

```npm start``` and we can visit http://localhost:4001 to execute an example query:

```
query Partner($partnerId: ID!) {
  partner(id: $partnerId) {
    name
  }
}
```

```
{
  "partnerId": "1"
}
```

Now we are good to publish this as its own subgraph! 
```
rover subgraph publish Starbucks-Supergraph-Worksh@current \
  --schema ./schema.graphql \
  --name monolith \
  --routing-url http://localhost:4001
```

Uh-oh! We should see an error:
```

error[E007]: The graph `Starbucks-Supergraph-Worksh@current` is a non-federated graph. This operation is only possible for federated graphs.
        If you are sure you want to convert a non-federated graph to a subgraph, you can re-run the same command with a `--convert` flag.
```

So what exactly went wrong? 
Well, when we set up our graph in Studio, we chose a monolith architecture, which created a non-federated graph. This was suitable for our purposes at the time, but now that we're breaking down the monolith into subgraphs, we need to make sure our graph is using federation. There is a specific flag that allows us to 'convert' it from a monolith to a supergraph / subgraph:

```
rover subgraph publish Starbucks-Supergraph-Worksh@current \
  --schema ./schema.graphql \
  --name monolith \
  --routing-url http://localhost:4001 \
  --convert
```

We can now verify that this subgraph has been successfully published to our newly converted federated supergraph! 


## Supergraph Router
By default, subgraph errors are omitted from router logs for security reasons. The setting we're referencing in the configuration file, include_subgraph_errors, is a setting that will allow the router to share the details of any errors that occur as it communicates with subgraphs. By setting the all key to true, we're telling the router that we want to know about errors that occur in all of our subgraphs.

### Configuring the router
We need to first download the router binary:
```
curl -sSL https://router.apollo.dev/download/nix/v1.37.0 | sh
```

We are going to keep the router configuration very simple, but you can view the full configuration spec here: https://www.apollographql.com/docs/router/configuration/overview/

Create a folder called `router`, and we are going to install the binary into that folder. We are also going to create a .env file and a `config.yaml` file which will configure our router.

Change directory into the newly created `router` folder and run the following command (or save the above into the router folder)


Below is the router configuration:

```
include_subgraph_errors:
  all: true # Propagate errors from all subgraphs
```


### Running the Router

Now in a separate terminal, we will need to run the router:
In a new terminal, navigate to the router directory.

To start the router, we'll type in our APOLLO_KEY and APOLLO_GRAPH_REF. (Remember, you can find these variables inside of your .env file!) Then, start the router with ./router, and finally add the --config flag with the path to the config.yaml file.


```
router
APOLLO_KEY=service:Starbucks-Supergraph-Worksh:QkYeGzLtj3-MvZ1KxsatAA APOLLO_GRAPH_REF=Starbucks-Supergraph-Worksh@current ./router --config config.yaml
```

We should see output messages in the terminal, with our router running at 127.0.0.1:4000.

Remember port 4000 was where the original monolith GraphQL server was running? Now we've successfully replaced it with the router! Clients don't have to do anything extra to change their endpoints, they can keep querying as usual.

There are many different configuration nodees you can specify in the router configuration yaml, we won't mention all now but we can take a look at what NGPOS does for its router configuration a little bit later. 



# Splitting up the monolith

## Subgraph planning
Deciding on where to start splitting off subgraphs can feel overwhelming. This is especially true if you have a large, complex graph, with multiple teams contributing and clients depending on its continued operation. We recommend keeping in mind a core principle of federation: incremental adoption. We'll break off the monolith subgraph's functionality one concern at a time.

Copy the `subgraph-template` folder and paste it in the root directoy. We will rename it to `subgraph-products`

Modify the `index.js` file to update the `port` and `subgraphName`:
```
  const port = 4002; // TODO: change port number
  const subgraphName = 'products'; // TODO: change to subgraph name
```

Now we can `cd` into the `subgraph-products` folder, and run the following to start it up:

```
npm install
npm start
```

Visiting http://localhost:4002 should look familiar!

Great, now we have the base down! We need to start migrating entry points to our new subgraph schema. A good thing to know is that we don't have to do this all at once! We can first migrate the types, then the queries, then the mutations!

### Migrating types, interfaces, queries and mutations to subgraphs
Starting with the types, we can easily identify which types the partners subgraph should own!

We have a pretty easy understanding on which subgraph would own what. The monolith we will treat as our first subgraph, and it will contain all Partner logic. Let's start by moving the Product types, queries and mutations to the subgraph-products schema file:

We can copy and paste pretty much everything, it should look like (keep in mind the import at the top, which will come after):


```
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key"])
        
type Query {
  products: [Product!]!
  product(id: ID!): Product!
}

type Mutation {
  createProduct(product: ProductInput!): CreateProductResponse
  updateProduct(productId: ID!, updateProductInput: UpdateProductInput!): UpdateProductResponse
}

type Product {
  id: ID!
  name: String!
  sku: Int!
  image: String
  price: Float!
  stock: Int!
  category: ProductCategory!
  availability: Boolean!
}

type Partner @key(fields: "id") {
  id: ID!
  favoriteProduct: Product
}

enum ProductCategory {
  Beverage
  Food
  Merch
}

input ProductInput {
  name: String!
  sku: Int!
  image: String
  price: Float!
  stock: Int!
  category: ProductCategory!
}

input UpdateProductInput {
  name: String
  sku: Int
  image: String
  price: Float
  stock: Int
  category: ProductCategory
}

interface MutationResponse {
  code: Int!
  success: Boolean!
  message: String!
}

type CreateProductResponse implements MutationResponse {
  code: Int!
  success: Boolean!
  message: String!
  product: Product
}

type UpdateProductResponse implements MutationResponse {
  code: Int!
  success: Boolean!
  message: String!
  product: Product
}
```

And the monolith:

```
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key"])

type Query {
  partners: [Partner!]!
  partner(id: ID!): Partner!
}

type Mutation {
  createPartner(partner: PartnerInput!): CreatePartnerResponse
  updatePartner(partnerId: ID!, updatePartnerInput: UpdatePartnerInput!): UpdatePartnerResponse
}

"A Starbucks employee, both retail and non-retail"
type Partner @key(fields: "id") {
  id: ID!
  name: String!
  position: EmployeePosition!
  email: String!
}

input PartnerInput {
  name: String!
  position: EmployeePosition!
  email: String!
}

enum EmployeePosition {
  Barista
  Manager
  Engineer
  CEO
}

input UpdatePartnerInput {
  name: String
  position: EmployeePosition
  email: String
}

interface MutationResponse {
  "Similar to HTTP status code, represents the status of the mutation"
  code: Int!
  "Indicates whether the mutation was successful"
  success: Boolean!
  "Human-readable message for the UI"
  message: String!
}

type CreatePartnerResponse implements MutationResponse {
  "Similar to HTTP status code, represents the status of the mutation"
  code: Int!
  "Indicates whether the mutation was successful"
  success: Boolean!
  "Human-readable message for the UI"
  message: String!
  "The newly created product"
  partner: Partner
}

type UpdatePartnerResponse implements MutationResponse {
  "Similar to HTTP status code, represents the status of the mutation"
  code: Int!
  "Indicates whether the mutation was successful"
  success: Boolean!
  "Human-readable message for the UI"
  message: String!
  "The newly updated partner"
  partner: Partner
}

```



Now we can add the following schema extension to both monolith and subgraph schema files:
```
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key"])
        
```
With this line, we can specify the various directives we'd like to use within our schema file (such as @key, as shown in the import).

Now we want to setup our resolvers, so in our `subgraph-products/resolvers.js` we can add the following:

```
const resolvers = {
  Query: {
    products: (_, __, { dataSources }) => {
      return dataSources.productsAPI.getProducts();
    },
    product: (_, { id }, { dataSources }) => {
      return dataSources.productsAPI.getProduct(id);
    },
  },
  Mutation: {
    createProduct: async (_, { product }, { dataSources }) => {
      return await dataSources.productsAPI.createProduct(product)
    },
    updateProduct: async (_, { productId, updateProductInput }, { dataSources }) => {
      return await dataSources.productsAPI.updateProduct(productId, updateProductInput);
    },
  },
  Partner: {
    favoriteProduct: (partner, _, { dataSources }) => {
      return dataSources.productsAPI.getFavoriteProduct(partner.id);
    }
  },
  Product: {
    availability: (product, _, { dataSources }) => {
      return dataSources.productsAPI.getProductAvailability(product.id);
    }
  }
};

module.exports = resolvers;
```

and finally our datasources/products.js file (for now just copy and paste this). 

So now we have an interesting scenario. If you notice, we reference the Product as a return type for our favoriteProduct field on partners:

```
type Partner {
  id: ID!
  name: String!
  position: EmployeePosition!
  email: String!
  favoriteProduct: Product!
}

```

We want to make sure that we aren't keeping track of duplicate types in both subgraph schemas, right? So to do so, we will introduce the concept of entities. 

**Entities** are object types that can resolve their fields across multiple subgraphs. More on entities:

- We can define entities in subgraphs, and these subgraphs can contribute fields to the entity and resolve these fields independently.
- An entity can be referenced by using it as the return type for a field.

This makes `Partner` prime candidate for an entity! We need to define certain fields in our monolith aka `partners` subgraph, and (at least for now) one field that should be resolved via the `products` subgraph! 

So, given this, in our `subgraph-products` we can implement this entity with the necessary fields that this subgraph would handle in  terms of resolvability:

```
type Partner @key(fields: "id") {
  id: ID!
  favoriteProduct: Product
}
```

We can now remove the `favoriteProduct` field from our `monolith` schema, resulting in:

```
type Partner @key(fields: "id") {
  id: ID!
  name: String!
  position: EmployeePosition!
  email: String!
}

```

Notice how, aside from the id, the fields are distinct and unique to the subgraph? Now we should figure out if we need to do anything special for the resolvers!

Important note: **Subgraphs that contribute fields to an entity use a special resolver called a reference resolver to resolve entities. This function enables the router to directly access entity fields that each subgraph contributes.**

Reference resolvers a bit tricky. Let's think about it as if you're working on a big school project with several classmates, and each of you is responsible for a different part of the project. You've divided up the topics, and each person gathers specific information about their topic.

Suppose you’re working on a project about a technology company, and you're in charge of collecting info on their partnerships. Each partner the company works with has an ID number, but that's all you know from your segment. You need more details like what these partners do, how they work with the company, etc.

Here’s where the __resolveReference comes into play, similar to asking a specific classmate for the detailed info they have:

    Partial Information: You have the ID of a partner but not the full details.

    Asking for Details: You go to your classmate who is focused on detailed profiles of each partner. You show them the ID, and say, "Hey, can you give me more info on this partner?"

    Getting Full Information: Your classmate looks up their research, finds the full details of the partner, and shares them with you.

    Completing Your Part: Now you have the complete information, and you can incorporate it into the project, making your part complete and connected to the whole project.

Similarly, in a computer system that uses Apollo Federation for managing its data, the __resolveReference function acts like going to the classmate who can provide the full details based on a little bit of initial information (like the partner ID). This function ensures that even though the data is managed in parts, anyone who needs the complete data can get it efficiently and accurately from the right source.

Every reference resolver has the name `__resolveReference`. It's a function with three arguments:

- **reference**: The entity representation object that's passed in by the router, which includes the entity's `__typename` and `@key` fields. This tells the subgraph which instance of an entity is being requested. 

- **context**: The object shared across all resolvers that are executing for a particular operation, as in normal resolvers. (Note that by convention, we refer to this `__resolveReference` argument as context, rather than contextValue as in other resolvers!)

- **info**: information about the operation's execution state, including the field name and the path to the field from the root, as in normal resolvers.

That being said, we need to add a reference resolver for the Partners's resolver:

Below is the subgraph-products resolver:
```
const resolvers = {
  Query: {
    products: (_, __, { dataSources }) => {
      return dataSources.productsAPI.getProducts();
    },
    product: (_, { id }, { dataSources }) => {
      return dataSources.productsAPI.getProduct(id);
    },
  },
  Mutation: {
    createProduct: async (_, { product }, { dataSources }) => {
      return await dataSources.productsAPI.createProduct(product);
    },
    updateProduct: async (_, { productId, updateProductInput }, { dataSources }) => {
      return await dataSources.productsAPI.updateProduct(productId, updateProductInput);
    },
  },
  Product: {
    availability: (product, _, { dataSources }) => {
      return dataSources.productsAPI.getProductAvailability(product.id);
    }
  },
  Partner: {
    favoriteProduct: ({ id }, _, { dataSources }) => {
      return dataSources.productsAPI.getFavoriteProduct(id);
    },
  }
};

module.exports = resolvers;

```

And the partners (monolith) resolver:

```
const resolvers = {
  Query: {
    partners: (_, __, { dataSources }) => {
      return dataSources.partnersAPI.getPartners();
    },
    partner: (_, { id }, { dataSources }) => {
      return dataSources.partnersAPI.getPartner(id);
    },
  },
  Mutation: {
    createPartner: async (_, { partner }, { dataSources }) => {
      return await dataSources.partnersAPI.createPartner(partner);
    },
    updatePartner: async (_, { partnerId, updatePartnerInput }, { dataSources }) => {
      return await dataSources.partnersAPI.updatePartner(partnerId, updatePartnerInput);
    },
  },
  Partner: {
    __resolveReference(partner, { dataSources }) {
      return dataSources.partnersAPI.getPartner(partner.id)
    },
  }
}

module.exports = resolvers;

```

And finally the index.js, let's be sure only to specify the single datasource:

```
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


```

```
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');

const { readFileSync } = require('fs');
const axios = require('axios');
const gql = require('graphql-tag');

const typeDefs = gql(readFileSync('./schema.graphql', { encoding: 'utf-8' }));
const resolvers = require('./resolvers');
const ProductsDataSource = require('./datasources/products');

async function startApolloServer() {
  const server = new ApolloServer({
    schema: buildSubgraphSchema({
      typeDefs,
      resolvers,
    }),
  });

  const port = 4003;
  const subgraphName = 'products';

  try {
    const { url } = await startStandaloneServer(server, {
      context: async ({ req }) => {
        const { cache } = server;

        return {
          dataSources: {
            productsAPI: new ProductsDataSource(),
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

```

Now we should have almost everything setup. Lets move on with the deployment side. 


### Publishing the subgraph schemas

```
rover subgraph publish <APOLLO_GRAPH_REF> \
  --schema ./subgraph-products/schema.graphql \
  --name product \
  --routing-url http://localhost:4002
```


Now we should have our schema pushed, and we have the router, the monolith (partners subgraph), and product subgraph running. 




#  A look into Starbucks Supergraph / Monolith migration



## TODO / Come back to:
Returning entity representations
There are a few fields in the monolith subgraph that will need to reference the Host and Guest entities. For these fields, we're going to jump to their corresponding resolvers and have them return an entity representation.

If you recall from Voyage I, an entity representation is an object that the router uses to represent a specific entity from another subgraph. It contains a __typename property and values for the entity's primary key fields. In our case, the primary key field for both Host and Guest is id.

We'll return an entity representation for each the following resolvers in the monolith subgraph:

