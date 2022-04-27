const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const Logs = require('./model/logs')
const User = require('./model/user')

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    const user = getUserByEmail(email)
    if (!user) {
      return done(null, false, { message: 'Invalid email/password' })
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        async function run() {
          const logs = await User.find({email:user})
          console.log("////////////////////////////////////////////////////"+logs+"/////////////////////////////////////////////////////////////////////")
          // let date_ob = new Date();
          // let set_date = ("0" + date_ob.getDate()).slice(-2);
          // let year = date_ob.getFullYear();
          // let hours = date_ob.getHours();
          // let min = ("0" + date_ob.getMinutes()).slice(-2);
          // var midday = "AM";
          // midday = (hours >= 12) ? "PM" : "AM"; /* assigning AM/PM */
          // hours = (hours == 0) ? 12 : ((hours > 12) ? (hours - 12): hours);
          // const monthNames = ["January", "February", "March", "April", "May", "June",
          //   "July", "August", "September", "October", "November", "December"
          // ];
          // const log_time = hours + ":" + min + " " + midday
          // const log_date = monthNames[date_ob.getMonth()] + " " + set_date + ", " + year
          // const response = new Logs({
          //   usertype: logs.usertype,
          //   id: Date.now(),
          //   first_name: logs.first_name,
          //   last_name: logs.last_name,
          //   email: logs.email,
          //   log_date,
          //   log_time
          // })
          // await logs.save()
          // console.log(response)
        }
        run().catch(console.dir);
        return done(null, user)
      } else {
        return done(null, false, { message: 'Password incorrect' })
      }
    } catch (e) {
      return done(e)
    }
  }
  
  passport.use('patient-local',new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize