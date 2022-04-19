const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize2(passport, getUserByUsername, getUserById) {
  const authenticateUser2 = async (username, password, done) => {
    const user = getUserByUsername(username)

    if (!user) {
      return done(null, false, { message: 'Invalid username/password' })
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

  passport.use('admin-local',new LocalStrategy({ usernameField: 'username' }, authenticateUser2))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize2