const { Agenda } = require('agenda');
// require("dotenv").config({ path: ".env" });

const agendaConfig = {
  db: {
    address: process.env.MONGODB,
    collection: 'agendaJobs'
  }
}
const agenda = new Agenda(agendaConfig);

// listen for the ready or error event.
agenda
  .on('ready', () => console.log("Agenda Job Scheduler started!"))
  .on('error', () => console.log("Agenda Job Scheduler connection error!"));

const jobTypes = process.env.JOB_TYPES ? process.env.JOB_TYPES.split(',') : ['exportReport', 'reuploadWishlist', 'uploadWishlist'];
jobTypes.forEach(type => {
  require('./jobs/' + type)(agenda);
});

// console.log({ jobs: agenda._definitions });

// (async function () {
//   await agenda.start();
// })();

module.exports = agenda;