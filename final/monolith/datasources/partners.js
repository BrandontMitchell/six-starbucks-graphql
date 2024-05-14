const { partners } = require('../partners.json');
const fs = require('fs');
const path = require('path');

class PartnerDataSource {
  getPartner(id) {
    return partners.find(partner => partner.id === id);
  }

  getPartners() {
    return partners;
  }

  createPartner(partnerInput) {
    const newPartner = {
      id: (partners.length + 1).toString(),
      ...partnerInput,
    };

    partners.push(newPartner);
    this._savePartnersToFile();
    return {
      code: 200,
      success: true,
      message: 'Partner created successfully',
      partner: newPartner,
    };
  }

  updatePartner(partnerId, updatePartnerInput) {
    console.log(updatePartnerInput)
    const partnerIndex = partners.findIndex(partner => partner.id === partnerId);
    if (partnerIndex === -1) {
      return {
        code: 404,
        success: false,
        message: 'Partner not found',
        partner: null,
      }
    }

    const updatedPartner = {
      ...partners[partnerIndex],
      ...updatePartnerInput,
    };

    console.log(updatedPartner)

    partners[partnerIndex] = updatedPartner;
    this._savePartnersToFile();
    return {
      code: 200,
      success: true,
      message: 'Partner updated successfully',
      partner: updatedPartner,
    }
  }


  _savePartnersToFile() {
    const filePath = path.join(__dirname, '../partners.json');
    const data = JSON.stringify({ partners }, null, 2);
    fs.writeFileSync(filePath, data);
  }
}

module.exports = PartnerDataSource;