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
