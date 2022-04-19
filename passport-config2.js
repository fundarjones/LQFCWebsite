const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize2(passport, getUserByEmail, getUserById) {
  const authenticateUser2 = async (email, password, done) => {
    const user = getUserByEmail(email)

    if (!user) {
      return done(null, false, { message: 'Invalid email/password' })
    }
    
    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'Password incorrect' })
      }
    } catch (e) {
      return done(e)
    }
  }

  passport.use('doctor-local',new LocalStrategy({ usernameField: 'email' }, authenticateUser2))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize2