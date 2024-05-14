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