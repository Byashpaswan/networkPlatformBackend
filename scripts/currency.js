const {  makeRequest } = require('../plugin/plugin');
const debug = require("debug")("darwin:scripts:currency");
const CurrencyModel = require('../db/currency');
exports.saveCurrency = async ()=>{
    const url = 'https://api.exchangerate-api.com/v4/latest/USD';
    debug(url);
    try {
        let result = await makeRequest({ method: 'get', url: url, });
        let res = result.data;
        if (res && res.base && res.date && res.rates)
        {
            let date = res.date;
            let base_currency = res.base
            let rates = Object.keys(res.rates);
            rates.forEach(element => {
                let filter = { "currency": element };
                let projection = { _id: 1, currency_value:1};
                CurrencyModel.getOneCurrency(filter, projection).then(result => {
                    if (!result) {
                        let curr = new CurrencyModel({
                            currency: element,
                            currency_value: res.rates[element],
                            base_currency: base_currency,
                            date: date
                        })
                        debug(curr);
                        curr.save().then(save_res => {
                            
                        })
                        .catch(err => {
                            debug(err);
                        })
                    }
                    else if (result && result._id) {
                        if (result.currency_value != res.rates[element])
                        {
                            // debug(result);

                            CurrencyModel.updateCurrency({ _id: result._id }, { currency_value: res.rates[element], data: date }).then(update_res => {
                                
                            }).catch(err => {
                                debug(err);
                            });
                        }
                    }
                }).catch(err => {
                    debug(err);
                })
            });
        }    
    }
    catch(e){
        debug(e);
    }
     
}