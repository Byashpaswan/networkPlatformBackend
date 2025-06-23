const debug = require("debug")("darwin:Controller:jsontocsv");
const fastCsv  = require('fast-csv');
const Response = require('../../helpers/Response');


exports.downloadFile = (req, res) => {
    try {
        const cursor = req.cursor;
        const transformer = req.transformer;
        // const transformer = (doc) => {
        //     let country = [];
        //     if (doc.geo_targeting && doc.geo_targeting.country_allow)
        //     {
        //         doc.geo_targeting.country_allow.map(obj => {
        //             if (obj.key)
        //             {
        //                 country.push(obj.key);    
        //             }
        //         })
        //     }
        //     return {
        //         '': '',
        //         OffersName: doc.offer_name,
        //         NetworkName: doc.advertiser_name,
        //         PackageName: doc.app_id,
        //         Platform: doc.platform_name,
        //         'blank': '',
        //         CountryCode: country.join(','),
        //         ToBeChecked: "to be checked",
        //         Payout: doc.payout,
        //         Link: "http://" + req.network_unique_id + "." + process.env.TRACKING_DOMAIN + "/" + process.env.TRACKING_PATH + "?offer_id=" + doc._id + "&aff_id=" + req.accountid + "&" + req.network_setting
        //     };
        // }

        const filename = 'export.csv';
        
        res.setHeader("Content-disposition", `attachment; filename=${filename}`);
        res.writeHead(200, {
            "Content-Type": "text/csv"
        });
        const csvStream = fastCsv.format({ headers: true, delimiter: ";"}).transform(transformer);
        cursor.pipe(csvStream).pipe(res);
        
    }
    catch (e)
    {
        debug(e)
        let response = Response.error();
        response.msg = "error fetching data, Try again Later";
        response.error = [e.message];
        return res.status(400).json(response);
    }
}