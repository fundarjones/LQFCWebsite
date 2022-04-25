if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const path = require('path')
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const crypto = require('crypto')
const User = require('./model/user')
const Doctor = require('./model/doctor')
const resetToken = require('./model/resetTokens')
const Admin = require('./model/admin')
const Staff = require('./model/staff')
const Branch = require('./model/branch')
const Appointment = require('./model/appointment')
const Diagnose = require('./model/diagnose')
const multer = require('multer')
const fs = require("fs")
const nodemailer = require("nodemailer");
const connectlivereload = require('connect-livereload')

const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')

const livereload = require("livereload")
const { Router } = require('express')

const publicDirectory = path.join(__dirname, 'public')

const liveReloadServer = livereload.createServer();
liveReloadServer.watch(publicDirectory)
liveReloadServer.server.once("connection", () =>{
setTimeout(() => {
  liveReloadServer.refresh('/')
}, 100);
})

mongoose.connect(process.env.MONGODB_URI ,{
useNewUrlParser: true,
useUnifiedTopology: true,
useCreateIndex: true
})

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

var transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS
  }
})

const urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(express.json())
app.use(session({
secret: process.env.SESSION_SECRET,
resave: false,
saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(express.static(publicDirectory))
app.use(connectlivereload())

app.get('/dashboard', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const admins = await Admin.findById(user_id)
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const staffs = await Staff.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, appointments) {
      if (err){
          console.log(err)  
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            const ttl = appointments + diagnosed
            res.render('patient/dashboard.ejs', { verified: req.user.isVerified, total: ttl, patient: patients, base: 'base64' })
          }
        })
      }
    })
    
  }
  else if (req.user.usertype == "doctor"){
    Appointment.countDocuments({branch:req.user.branch, appointment_status: "Approved"}, function (err, count) {
      if (err){
          console.log(err)
      }else{
        res.render('doctor/dashboard.ejs', { appointment: count, doctor: doctors, base: 'base64' })
      }
    })
  }
  else if (req.user.usertype == "staff"){
    Appointment.countDocuments({branch:req.user.branch, appointment_status: "Pending"}, function (err, count) {
      if (err){
          console.log(err)
      }else{
        Appointment.countDocuments({branch:req.user.branch, appointment_status: "Cancelled"}, function (err, cancel) {
          if (err){
              console.log(err)
          }else{
            res.render('staff/dashboard.ejs', {appointment: count, cancelled: cancel, staff: staffs, base: 'base64' })
          }
        })
      }
    })
    
  }
  else if (req.user.usertype == "admin"){
    Doctor.countDocuments({}, function (err, doctors) {
      if (err){
          console.log(err)
      }else{
        Staff.countDocuments({}, function (err, staffs) {
          if (err){
              console.log(err)
          }else{
            Branch.countDocuments({}, function (err, branches) {
              if (err){
                  console.log(err)
              }else{
                User.countDocuments({}, function (err, patients) {
                  if (err){
                      console.log(err)
                  }else{
                    res.render('admin/dashboard.ejs', {doctor: doctors, staff:staffs, patient: patients, branch:branches, admin: admins, base: 'base64' })
                  }
                })
              }
            })
          }
        })
      }
    })
  }
  else{
    res.render('404.ejs')
  }
})

app.get('/patient-login', checkNotAuthenticated, async (req, res) => {
  const users = await User.find();
  const initializePassport = require('./passport-config')
  initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
  )
  res.render('patient/patient-login.ejs')
})

app.get('/forgot-password', checkNotAuthenticated, async (req, res) => {
  res.render('forgot-password.ejs')
})

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('patient/signup.ejs')
})

app.get('/appointments', checkAuthenticated, async (req, res) => {
  const patient = await User.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const appointments = await Appointment.find()
  const patient_appointments = await Appointment.find({ img_id: req.user.id })
  const diagnosis = await Diagnose.find({ img_id: req.user.id })

  if (req.user.usertype == "patient") {
    console.log(patient_appointments)
    res.render('patient/appointments.ejs', { diagnose: diagnosis, appointment: patient_appointments, patient: patients, base: 'base64' })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/appointments.ejs', { appointment: appointments, doctor: doctors, patients: patient, base: 'base64'  })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/appointments.ejs', { appointment: appointments, staff: staffs, patients: patient, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/appointments.ejs', { patient: patients, appointment: appointments, admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/add-doctors', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const branches = await Branch.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/add-doctor.ejs', { branch: branches, doctors: doc, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/add-staff', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const branches = await Branch.find()
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/add-staff.ejs', { branch: branches, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/edit-branch', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const branches = await Branch.find();
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64'  })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { branch: branches, admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/edit-branch/:_id', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const edit_id = req.params._id
  const edit_branch = await Branch.findById(edit_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64'  })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/edit-branch.ejs', { edit: edit_branch, admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/edit-doctor', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64' })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { doctors: doc, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/edit-doctor/:_id', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const edit_id = req.params._id
  const edit_doctor = await Doctor.findById(edit_id)
  const branches = await Branch.find()
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64' })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/edit-doctor.ejs', { branch: branches, edit: edit_doctor,doctors: doc, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/edit-staff', checkAuthenticated, async (req, res) => {
  const staff = await Doctor.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64' })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/edit-staff/:_id', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const edit_id = req.params._id
  const edit_staff = await Staff.findById(edit_id)
  const branches = await Branch.find()
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64' })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/edit-staff.ejs', { branch: branches, edit: edit_staff, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/diagnose-patient', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "staff"){
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { doctors: doc, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/diagnose-patient/:_id', checkAuthenticated, async (req, res) => {
    const doc = await Doctor.find();
    const user_id = req.user._id
    const patients = await User.findById(user_id)
    const doctors = await Doctor.findById(user_id)
    const admins = await Admin.findById(user_id)
    const appointment_id = req.params._id
    const diagnose_patient = await Appointment.findById(appointment_id)
    const follow = await Diagnose.findById(appointment_id)
    if (req.user.usertype == "patient") {
      rAppointment.countDocuments({img_id: req.user.id}, function (err, total) {
        if (err){
            console.log(err)
        }else{
          Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
            if (err){
                console.log(err)
            }else{
              res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
            }
          })
        }
      })
    }
    else if (req.user.usertype == "doctor"){
      res.render('doctor/diagnostic-test.ejs', { followup: follow, diagnose: diagnose_patient, doctor: doctors, base: 'base64' })
    }
    else if (req.user.usertype == "admin"){
      res.render('admin/dashboard.ejs', { doctors: doc, admin: admins , base: 'base64'})
    }
    else{
      res.render('404.ejs')
    }
})

app.get('/doctors', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, patients: users, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/doctors.ejs', { doctors: doc, admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs', { fname: req.user.first_name, lname: req.user.last_name, base: 'base64' })
  }
  
})

app.get('/staffs', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.find();
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/staffs.ejs', { staff: staffs, admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs', { fname: req.user.first_name, lname: req.user.last_name , base: 'base64' })
  }
  
})



app.get('/branches', checkAuthenticated, async (req, res) => {
  const branch = await Branch.find();
  const user_id = req.user._id
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors , base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/branches.ejs', {  branches: branch , admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})



app.get('/add-branches', checkAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const user_id = req.user._id
  const branches = await Branch.findById(user_id)
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor"){
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/add-branches.ejs', { doctors: doc, admin: admins, branches: branches, base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/profile', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const admins = await Admin.findById(user_id)
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const staffs = await Staff.findById(user_id)
  if (req.user.usertype == "patient") {
    res.render('patient/profile.ejs', { patient: patients, base: 'base64' })
  }
  else if (req.user.usertype == "doctor") {
    res.render('doctor/profile.ejs', { doctor: doctors , base: 'base64' })
  }
  else if (req.user.usertype == "staff") {
    res.render('staff/profile.ejs', { staff: staffs , base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/profile.ejs', { admin: admins , base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/settings', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const admins = await Admin.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const patients = await User.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const doc = await Doctor.find();
  const patient = await User.find();
  if (req.user.usertype == "patient") {
    res.render('patient/settings.ejs', { 
      patient: patients, base: 'base64' })
  }
  else if (req.user.usertype == "doctor") {
    res.render('doctor/settings.ejs', { 
      doctor: doctors, patients: doc , base: 'base64' })
  }
  else if (req.user.usertype == "staff") {
    res.render('staff/settings.ejs', { 
      staff: staffs, patients: doc , base: 'base64' })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/settings.ejs', { 
      patients: patient, admin: admins , base: 'base64'})
  }
  else{
    res.render('404.ejs')
  }
  
})



app.get('/patients', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const admins = await Admin.findById(user_id)
  const patients = await User.findById(user_id)
  const doctors = await Doctor.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const patient = await User.find();
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor") {
    res.render('doctor/patients.ejs', { doctor: doctors, patients: patient, base: 'base64'  })
  }
  else if (req.user.usertype == "staff") {
    res.render('staff/patients.ejs', { staff: staffs, patients: patient, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/patients.ejs', { admin: admins, patients: patient, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/set-appointment', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id) 
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const branches = await Branch.find()
  const appointments = await Appointment.find()
  if (req.user.usertype == "patient") {
    res.render('patient/set-appointment.ejs',{ appointment: appointments, branch: branches, patient: patients, base: 'base64'})
  }
  else if (req.user.usertype == "doctor") {
    res.render('doctor/dashboard.ejs', { doctor: doctors, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/notification', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id) 
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const branches = await Branch.find()
  const appointments = await Appointment.find()
  const patient_appointments = await Appointment.find({ img_id: req.user.id })
  if (req.user.usertype == "patient") {
    res.render('patient/notifications.ejs',{ appointment: patient_appointments,branch: branches, patient: patients, base: 'base64'})
  }
  else if (req.user.usertype == "doctor") {
    res.render('doctor/notifications.ejs', { appointment: appointments,doctor: doctors, base: 'base64'  })
  }
  else if (req.user.usertype == "staff") {
    res.render('staff/notifications.ejs', { appointment: appointments, staff: staffs, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/diagnosed-records', checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  const patients = await User.findById(user_id) 
  const doctors = await Doctor.findById(user_id)
  const admins = await Admin.findById(user_id)
  const staffs = await Staff.findById(user_id)
  const diagnosis = await Diagnose.find()
  if (req.user.usertype == "patient") {
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { diagnose: diagnosed , total: total, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
  else if (req.user.usertype == "doctor") {
    res.render('doctor/records.ejs', { diagnose: diagnosis, doctor: doctors, base: 'base64'  })
  }
  else if (req.user.usertype == "staff") {
    res.render('staff/dashboard.ejs', { staff: staffs, base: 'base64'  })
  }
  else if (req.user.usertype == "admin"){
    res.render('admin/dashboard.ejs', { admin: admins, base: 'base64' })
  }
  else{
    res.render('404.ejs')
  }
  
})

app.get('/doctor-login', checkNotAuthenticated, async (req, res) => {
  const doc = await Doctor.find();
  const initializePassport2 = require('./passport-config2')
  initializePassport2(
  passport,
  email => doc.find(user => user.email === email),
  id => doc.find(user => user.id === id)
  )
  res.render('doctor/doctor-login.ejs')
})

app.get('/admin-login', checkNotAuthenticated, async (req, res) => {
  const admin = await Admin.find();
  const initializePassport3 = require('./passport-config3')
  initializePassport3(
  passport,
  username => admin.find(user => user.username === username),
  id => admin.find(user => user.id === id)
  )
  res.render('admin/login.ejs')
})

app.get('/staff-login', checkNotAuthenticated, async (req, res) => {
  const staff = await Staff.find();
  const initializePassport4 = require('./passport-config4')
  initializePassport4(
  passport,
  email => staff.find(user => user.email === email),
  id => staff.find(user => user.id === id)
  )
  res.render('staff/login.ejs')
})

app.get('/', checkNotAuthenticated, async(req,res) => {
  const branches = await Branch.find()
  Branch.countDocuments({}, function (err, count) {
    if (err){
        console.log(err)
    }else{
      res.render('index.ejs', {branch: branches, count: count})
    }
  })


})

app.get('/about', checkNotAuthenticated, async(req,res) => {
  const branches = await Branch.find()
  res.render('about.ejs', {branch: branches})
})

app.get('/contact', checkNotAuthenticated, async(req,res) => {
  const branches = await Branch.find()
  res.render('contact.ejs', {branch: branches})
})

app.get('/lqfc-doctors', checkNotAuthenticated, async (req,res) => {
  const doctors = await Doctor.find()
  const branches = await Branch.find()
  res.render('doctors.ejs', {doctor: doctors, branch: branches})
})

app.get('/doctors-profile/:_id', checkNotAuthenticated, async (req,res) => {
  const user_id = req.params._id
  const doctors = await Doctor.findById(user_id)
  const branches = await Branch.findOne({branch_name: doctors.branch})
  res.render('doctors-profile.ejs', {doctor: doctors, branch: branches})
})

app.get('/terms-conditions', (req,res) => {
  res.render('terms-conditions.ejs')
})

app.get('/services', checkNotAuthenticated, async(req,res) => {
  const branches = await Branch.find()
  res.render('services.ejs', {branch: branches})
})

const sendResetEmail = async(email,token) =>{

  var url = "https://lqfclinic.herokuapp.com/reset-password?token="+token

  var mailOptions = {
    from: "lqfclinic@gmail.com",
    to: email,
    subject: "LQFCLINIC: RESET YOUR PASSWORD",
    text: `<!DOCTYPE html>
    <html>
    
    <head>
        <title></title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <style type="text/css">
            @media screen {
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 400;
                    src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 700;
                    src: local('Lato Bold'), local('Lato-Bold'), url(https://fonts.gstatic.com/s/lato/v11/qdgUG4U09HnJwhYI-uK18wLUuEpTyoUstqEm5AMlJo4.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 400;
                    src: local('Lato Italic'), local('Lato-Italic'), url(https://fonts.gstatic.com/s/lato/v11/RYyZNoeFgb0l7W3Vu1aSWOvvDin1pK8aKteLpeZ5c0A.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 700;
                    src: local('Lato Bold Italic'), local('Lato-BoldItalic'), url(https://fonts.gstatic.com/s/lato/v11/HkF_qI1x_noxlxhrhMQYELO3LdcAZYWl9Si6vvxL-qU.woff) format('woff');
                }
            }
    
            /* CLIENT-SPECIFIC STYLES */
            body,
            table,
            td,
            a {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
    
            table,
            td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
    
            img {
                -ms-interpolation-mode: bicubic;
            }
    
            /* RESET STYLES */
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
    
            table {
                border-collapse: collapse !important;
            }
    
            body {
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
            }
    
            /* iOS BLUE LINKS */
            a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }
    
            /* MOBILE STYLES */
            @media screen and (max-width:600px) {
                h1 {
                    font-size: 32px !important;
                    line-height: 32px !important;
                }
            }
    
            /* ANDROID CENTER FIX */
            div[style*="margin: 16px 0;"] {
                margin: 0 !important;
            }
        </style>
    </head>
    
    <body style="background-color: #d8eeff; margin: 0 !important; padding: 0 !important;">
        <!-- HIDDEN PREHEADER TEXT -->
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Lato', Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;"> We're thrilled to have you here! Get ready to dive into your new account. </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <!-- LOGO -->
            <tr>
                <td bgcolor="#294a75" align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" valign="top" style="padding: 40px 10px 40px 10px;"> </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#294a75" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="center" valign="top" style="padding: 40px 20px 20px 20px; border-radius: 4px 4px 0px 0px; color: #111111; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; letter-spacing: 4px; line-height: 48px;">
                                <h1 style="font-size: 48px; font-weight: 400; margin: 2;">Lagman Qualicare Family Clinic</h1> 
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">We heard that you have lost your password. Just press the button below to reset your password.</p>
                            </td>
                        </tr>
                        <tr>
                            <td bgcolor="#ffffff" align="left">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="border-radius: 3px;" bgcolor="#294a75"><a href="${url}" target="_blank" style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #1746e0; display: inline-block;">Reset Password</a></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 0px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 20px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;"><a href="#" target="_blank" style="color: #1746e0;">${url}</a></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 30px 10px 0px 10px;">
                    
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    
    </html>`,
    html: `<!DOCTYPE html>
    <html>
    
    <head>
        <title></title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <style type="text/css">
            @media screen {
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 400;
                    src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 700;
                    src: local('Lato Bold'), local('Lato-Bold'), url(https://fonts.gstatic.com/s/lato/v11/qdgUG4U09HnJwhYI-uK18wLUuEpTyoUstqEm5AMlJo4.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 400;
                    src: local('Lato Italic'), local('Lato-Italic'), url(https://fonts.gstatic.com/s/lato/v11/RYyZNoeFgb0l7W3Vu1aSWOvvDin1pK8aKteLpeZ5c0A.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 700;
                    src: local('Lato Bold Italic'), local('Lato-BoldItalic'), url(https://fonts.gstatic.com/s/lato/v11/HkF_qI1x_noxlxhrhMQYELO3LdcAZYWl9Si6vvxL-qU.woff) format('woff');
                }
            }
    
            /* CLIENT-SPECIFIC STYLES */
            body,
            table,
            td,
            a {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
    
            table,
            td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
    
            img {
                -ms-interpolation-mode: bicubic;
            }
    
            /* RESET STYLES */
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
    
            table {
                border-collapse: collapse !important;
            }
    
            body {
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
            }
    
            /* iOS BLUE LINKS */
            a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }
    
            /* MOBILE STYLES */
            @media screen and (max-width:600px) {
                h1 {
                    font-size: 32px !important;
                    line-height: 32px !important;
                }
            }
    
            /* ANDROID CENTER FIX */
            div[style*="margin: 16px 0;"] {
                margin: 0 !important;
            }
        </style>
    </head>
    
    <body style="background-color: #d8eeff; margin: 0 !important; padding: 0 !important;">
        <!-- HIDDEN PREHEADER TEXT -->
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Lato', Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;"> We're thrilled to have you here! Get ready to dive into your new account. </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <!-- LOGO -->
            <tr>
                <td bgcolor="#294a75" align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" valign="top" style="padding: 40px 10px 40px 10px;"> </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#294a75" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="center" valign="top" style="padding: 40px 20px 20px 20px; border-radius: 4px 4px 0px 0px; color: #111111; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; letter-spacing: 4px; line-height: 48px;">
                                <h1 style="font-size: 48px; font-weight: 400; margin: 2;">Lagman Qualicare Family Clinic</h1> 
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">We heard that you have lost your password. Just press the button below to reset your password.</p>
                            </td>
                        </tr>
                        <tr>
                            <td bgcolor="#ffffff" align="left">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="border-radius: 3px;" bgcolor="#294a75"><a href="${url}" target="_blank" style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #1746e0; display: inline-block;">Reset Password</a></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 0px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 20px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;"><a href="#" target="_blank" style="color: #1746e0;">${url}</a></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 30px 10px 0px 10px;">
                    
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    
    </html>`
  }

  transport.sendMail(mailOptions, function(error,info){
    if (error) {
      console.log(error);
    } else {
      console.log("Email has been sent")
    }
  })

}

const sendVerifyEmail = async (email, token) =>{
  // var url = path.join(__dirname, '/verifyEmail?token='+token);
  var url = "http://lqfclinic.herokuapp.com/verifyEmail?token="+token

  var mailOptions = {
    from: "lqfclinic@gmail.com",
    to: email,
    subject: "LQFCLINIC: VERIFY ACCOUNT",
    text: `<!DOCTYPE html>
    <html>
    
    <head>
        <title></title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <style type="text/css">
            @media screen {
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 400;
                    src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 700;
                    src: local('Lato Bold'), local('Lato-Bold'), url(https://fonts.gstatic.com/s/lato/v11/qdgUG4U09HnJwhYI-uK18wLUuEpTyoUstqEm5AMlJo4.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 400;
                    src: local('Lato Italic'), local('Lato-Italic'), url(https://fonts.gstatic.com/s/lato/v11/RYyZNoeFgb0l7W3Vu1aSWOvvDin1pK8aKteLpeZ5c0A.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 700;
                    src: local('Lato Bold Italic'), local('Lato-BoldItalic'), url(https://fonts.gstatic.com/s/lato/v11/HkF_qI1x_noxlxhrhMQYELO3LdcAZYWl9Si6vvxL-qU.woff) format('woff');
                }
            }
    
            /* CLIENT-SPECIFIC STYLES */
            body,
            table,
            td,
            a {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
    
            table,
            td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
    
            img {
                -ms-interpolation-mode: bicubic;
            }
    
            /* RESET STYLES */
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
    
            table {
                border-collapse: collapse !important;
            }
    
            body {
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
            }
    
            /* iOS BLUE LINKS */
            a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }
    
            /* MOBILE STYLES */
            @media screen and (max-width:600px) {
                h1 {
                    font-size: 32px !important;
                    line-height: 32px !important;
                }
            }
    
            /* ANDROID CENTER FIX */
            div[style*="margin: 16px 0;"] {
                margin: 0 !important;
            }
        </style>
    </head>
    
    <body style="background-color: #d8eeff; margin: 0 !important; padding: 0 !important;">
        <!-- HIDDEN PREHEADER TEXT -->
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Lato', Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;"> We're thrilled to have you here! Get ready to dive into your new account. </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <!-- LOGO -->
            <tr>
                <td bgcolor="#294a75" align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" valign="top" style="padding: 40px 10px 40px 10px;"> </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#294a75" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="center" valign="top" style="padding: 40px 20px 20px 20px; border-radius: 4px 4px 0px 0px; color: #111111; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; letter-spacing: 4px; line-height: 48px;">
                                <h1 style="font-size: 48px; font-weight: 400; margin: 2;">Lagman Qualicare Family Clinic</h1> 
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">Thanks for signing up with Lagman Qualicare Family Clinic! To activate your account please press the button below.</p>
                            </td>
                        </tr>
                        <tr>
                            <td bgcolor="#ffffff" align="left">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="border-radius: 3px;" bgcolor="#294a75"><a href="${url}" target="_blank" style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #1746e0; display: inline-block;">Verify Account</a></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 0px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 20px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;"><a href="${url}" target="_blank" style="color: #1746e0;">${url}</a></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 30px 10px 0px 10px;">
                    
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    
    </html>`,
    html: `<!DOCTYPE html>
    <html>
    
    <head>
        <title></title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <style type="text/css">
            @media screen {
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 400;
                    src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: normal;
                    font-weight: 700;
                    src: local('Lato Bold'), local('Lato-Bold'), url(https://fonts.gstatic.com/s/lato/v11/qdgUG4U09HnJwhYI-uK18wLUuEpTyoUstqEm5AMlJo4.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 400;
                    src: local('Lato Italic'), local('Lato-Italic'), url(https://fonts.gstatic.com/s/lato/v11/RYyZNoeFgb0l7W3Vu1aSWOvvDin1pK8aKteLpeZ5c0A.woff) format('woff');
                }
    
                @font-face {
                    font-family: 'Lato';
                    font-style: italic;
                    font-weight: 700;
                    src: local('Lato Bold Italic'), local('Lato-BoldItalic'), url(https://fonts.gstatic.com/s/lato/v11/HkF_qI1x_noxlxhrhMQYELO3LdcAZYWl9Si6vvxL-qU.woff) format('woff');
                }
            }
    
            /* CLIENT-SPECIFIC STYLES */
            body,
            table,
            td,
            a {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
    
            table,
            td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
    
            img {
                -ms-interpolation-mode: bicubic;
            }
    
            /* RESET STYLES */
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
    
            table {
                border-collapse: collapse !important;
            }
    
            body {
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
            }
    
            /* iOS BLUE LINKS */
            a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }
    
            /* MOBILE STYLES */
            @media screen and (max-width:600px) {
                h1 {
                    font-size: 32px !important;
                    line-height: 32px !important;
                }
            }
    
            /* ANDROID CENTER FIX */
            div[style*="margin: 16px 0;"] {
                margin: 0 !important;
            }
        </style>
    </head>
    
    <body style="background-color: #d8eeff; margin: 0 !important; padding: 0 !important;">
        <!-- HIDDEN PREHEADER TEXT -->
        <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: 'Lato', Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;"> We're thrilled to have you here! Get ready to dive into your new account. </div>
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <!-- LOGO -->
            <tr>
                <td bgcolor="#294a75" align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" valign="top" style="padding: 40px 10px 40px 10px;"> </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#294a75" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="center" valign="top" style="padding: 40px 20px 20px 20px; border-radius: 4px 4px 0px 0px; color: #111111; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: 400; letter-spacing: 4px; line-height: 48px;">
                                <h1 style="font-size: 48px; font-weight: 400; margin: 2;">Lagman Qualicare Family Clinic</h1> 
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 40px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">Thanks for signing up with Lagman Qualicare Family Clinic! To activate your account please press the button below.</p>
                            </td>
                        </tr>
                        <tr>
                            <td bgcolor="#ffffff" align="left">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td bgcolor="#ffffff" align="center" style="padding: 20px 30px 60px 30px;">
                                            <table border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="center" style="border-radius: 3px;" bgcolor="#294a75"><a href="${url}" target="_blank" style="font-size: 20px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #1746e0; display: inline-block;">Verify Account</a></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 0px 30px 0px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
                            </td>
                        </tr> <!-- COPY -->
                        <tr>
                            <td bgcolor="#ffffff" align="left" style="padding: 20px 30px 20px 30px; color: #666666; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px;">
                                <p style="margin: 0;"><a href="${url}" target="_blank" style="color: #1746e0;">${url}</a></p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 30px 10px 0px 10px;">
                    
                </td>
            </tr>
            <tr>
                <td bgcolor="#d8eeff" align="center" style="padding: 0px 10px 0px 10px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    
    </html>`
  }

  transport.sendMail(mailOptions, function(error,info){
    if (error) {
      console.log(error);
    } else {
      console.log("Email has been sent")
    }
  })
}

app.get("/send-verification-email", checkAuthenticated, async(req,res) =>{
  if (req.user.isVerified) {
    console.log("User is verified")
    res.redirect("/dashboard")
  } else {
    var token = crypto.randomBytes(32).toString('hex')
    await resetToken({token:token, email: req.user.email}).save();
    sendVerifyEmail(req.user.email, token)
    const patients = await User.findById(req.user._id)
    Appointment.countDocuments({img_id: req.user.id}, function (err, appointments) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            const ttl = appointments + diagnosed
            res.render('patient/dashboard.ejs', { emailSent: true , total: ttl, patient: patients, base: 'base64' })
          }
        })
      }
    })
  }
})

app.get("/verifyEmail", async(req,res) =>{
  const token = req.query.token;
  if(token){
    var check = await resetToken.findOne({ token: token })
    if (check) {

      var userData = await User.findOne({ email : check.email })
      userData.isVerified = true
      await userData.save()

      const response = await resetToken.findOneAndDelete({ token: token })

      console.log("User Verfication Successful", userData)
      console.log("Token Reset Successful", response)
      res.redirect("/dashboard")

    } else {
      try {
        const patients = await User.findById(req.user._id)
        Appointment.countDocuments({img_id: req.user.id}, function (err, appointments) {
        if (err){
            console.log(err)
        }else{
          Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
            if (err){
                console.log(err)
            }else{
              const ttl = appointments + diagnosed
              res.render('patient/dashboard.ejs', { err: "Invalid token or token expired", verified: req.user.isVerified, total: ttl, patient: patients, base: 'base64' })
            }
          })
        }
      }) 
      } catch (error) {
        console.log(error)
        res.redirect("/")
      }
      
    }
  } else {
    res.redirect("/dashboard")
  }
})

app.get("/reset-password", async(req,res) =>{
  const token = req.query.token;
  if(token){
    var check = await resetToken.findOne({ token: token })
    if (check) {

      // const response = await resetToken.findOneAndDelete({ token: token })
      res.render('forgot-password', { reset: true, email: check.email })
      
    } else {
      res.render('forgot-password', { msg: "Invalid token or token expired", type: "danger"})
    }
  } else {
    res.redirect("/")
  }
})

app.post("/reset-password", urlencodedParser,[
  check('password', 'Password must include one lowercase character, one uppercase character, a number, and a special character.')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i"),
    check('password', 'Password must be greater than 5 characters.')
    .isLength({min:6}),
    check('confirm_password')
      .custom(async (confirm_password, {req}) => {
        const password = req.body.password
        if(password !== confirm_password){
          throw new Error('Passwords must be same')
        }
      }),
  ],
  async (req,res) =>{
    const { password: plainTextPassword, confirm_password, email } = req.body
    const password = await bcrypt.hash(plainTextPassword, 10)
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
      const alert = errors.array()
      res.render('forgot-password', { reset: true, email: email , alert })
    } else {
      try {
        const patient = await User.findOne({email: email})
        patient.password = password
        await patient.save()
        const response = patient
        console.log('User password reset successful: ', response) 
        res.redirect('/patient-login')
      } catch (error) {
        console.log("An error has occured during the changing of password")
        res.render("/")
      }
    }
    
})

app.post("/forgot-password", async (req,res) =>{
  const { email } = req.body
  var userData = await User.findOne({ email: email })
  if (userData) {

    var token = crypto.randomBytes(32).toString('hex')

    await resetToken({token:token, email: email}).save();
    sendResetEmail( email, token)

    res.render('forgot-password', { msg: "Password reset link sent", type: "success"})

  } else {
    res.render('forgot-password', { msg: "No user found with that email", type: "danger"})
  }
})

function getYears(x) {
  return Math.floor(x / 1000 / 60 / 60 / 24 / 365);
}

app.post('/register', checkNotAuthenticated, urlencodedParser,[
  check('first_name', 'There must be no special characters in the first name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('last_name', 'There must be no special characters in the last name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('phone', 'Phone number must include 11 digits')
    .isLength({min:11, max:11}),
  check('email', 'Email is not valid')
    .isEmail()
    .normalizeEmail()
    .custom((value, {req}) => {
      return new Promise((resolve, reject) => {
        User.findOne({email:req.body.email}, function(err, user){
          if(err) {
            reject(new Error('Server Error'))
          }
          if(Boolean(user)) {
            reject(new Error('E-mail already in use'))
          }
          resolve(true)
        });
      });
    }),
  check('password', 'Password must include one lowercase character, one uppercase character, a number, and a special character.')
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i"),
  check('password', 'Password must be greater than 5 characters.')
  .isLength({min:6}),
  check('confirm_password')
    .custom(async (confirm_password, {req}) => {
      const password = req.body.password
      if(password !== confirm_password){
        throw new Error('Passwords must be same')
      }
    }),


], async (req, res) => {
  const { email, first_name, last_name, birthday, sex, status, phone, password: plainTextPassword } = req.body
  const password = await bcrypt.hash(plainTextPassword, 10)
  const errors = validationResult(req)
    if(!errors.isEmpty()) {
        const alert = errors.array()
        res.render('patient/signup.ejs', {
            alert
        })
    }
    else{
      try{
        let n = Date.now();
        let d = new Date(birthday);
        const response = new User({
                usertype: "patient",
                id: Date.now().toString(),
                first_name,
                last_name,
                birthday,
                age: getYears(n - d),
                bio: " ",
                sex,
                status,
                phone,
                email,
                password
            })
      await response.save()
      res.redirect('/patient-login')
      console.log('User created successfully: ', response)
    } catch {
        res.redirect('/register')
    }
    }
  
})

app.post('/add-doctors', checkAuthenticated, urlencodedParser,[
  check('first_name', 'There must be no special characters in the first name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('last_name', 'There must be no special characters in the last name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('birthday','Invalid Date of Birth')
    .isISO8601(),
  check('email', 'Email is not valid')
    .isEmail()
    .normalizeEmail()
    .custom((value, {req}) => {
      return new Promise((resolve, reject) => {
        Doctor.findOne({email:req.body.email}, function(err, user){
          if(err) {
            reject(new Error('Server Error'))
          }
          if(Boolean(user)) {
            reject(new Error('E-mail already in use'))
          }
          resolve(true)
        });
      });
    }),
  check('password', 'Password too small. Should be atleast 6 characters')
    .isLength({min:6}),
  check('confirm_password')
    .custom(async (confirm_password, {req}) => {
      const password = req.body.password
      if(password !== confirm_password){
        throw new Error('Passwords must be same')
      }
    })

], async (req, res) => {
  const doctor = new Doctor();
  if (req.body.specialization) {
    doctor.specialization = Array.isArray(req.body.specialization) ? req.body.specialization : [req.body.specialization]; 
  }
  const { email, first_name, last_name, birthday, specialization, branch, sex, status, phone, password: plainTextPassword } = req.body
  const errors = validationResult(req)
    if(!errors.isEmpty()) {
        const alert = errors.array()
        const user_id = req.user._id
        const users = await Admin.findById(user_id)
        const branches = await Branch.find()
        res.render('admin/add-doctor.ejs', { branch: branches, admin: users, base: "base64", alert
        })
    }
    else{
      try{
        const password = await bcrypt.hash(plainTextPassword, 10)
        let n = Date.now();
        let d = new Date(birthday);
        const response = new Doctor({
                usertype: "doctor",
                id: Date.now().toString(),
                first_name,
                last_name,
                birthday,
                specialization,
                branch,
                age: getYears(n - d),
                bio: " ",
                sex,
                status,
                phone,
                email,
                password
            })
      await response.save()
      res.redirect('/doctors')
      console.log('User created successfully: ', response)
    } catch (err){
      res.redirect('/dashboard')
      console.log(err)
    }
    }
})

app.post('/add-staff', checkAuthenticated, urlencodedParser,[
  check('first_name', 'There must be no special characters in the first name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('last_name', 'There must be no special characters in the last name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('birthday','Invalid Date of Birth')
    .isISO8601(),
  check('email', 'Email is not valid')
    .isEmail()
    .normalizeEmail()
    .custom((value, {req}) => {
      return new Promise((resolve, reject) => {
        Doctor.findOne({email:req.body.email}, function(err, user){
          if(err) {
            reject(new Error('Server Error'))
          }
          if(Boolean(user)) {
            reject(new Error('E-mail already in use'))
          }
          resolve(true)
        });
      });
    }),
  check('password', 'Password too small. Should be atleast 6 characters')
    .isLength({min:6}),
  check('confirm_password')
    .custom(async (confirm_password, {req}) => {
      const password = req.body.password
      if(password !== confirm_password){
        throw new Error('Passwords must be same')
      }
    })

], async (req, res) => {
  const { email, first_name, last_name, birthday, branch, sex, status, phone, password: plainTextPassword } = req.body
  const errors = validationResult(req)
    if(!errors.isEmpty()) {
        const alert = errors.array()
        const user_id = req.user._id
        const users = await Admin.findById(user_id)
        res.render('admin/add-staff.ejs', { admin: users, base: "base64", alert
        })
    }
    else{
      try{
        const password = await bcrypt.hash(plainTextPassword, 10)
        let n = Date.now();
        let d = new Date(birthday);
        const response = new Staff({
                usertype: "staff",
                id: Date.now().toString(),
                first_name,
                last_name,
                birthday,
                branch,
                age: getYears(n - d),
                bio: " ",
                sex,
                status,
                phone,
                email,
                password
            })
      await response.save()
      res.redirect('/staffs')
      console.log('User created successfully: ', response)
    } catch (err){
      res.redirect('/dashboard')
      console.log(err)
    }
    }
})

app.put('/update-info', checkAuthenticated, urlencodedParser,[
  check('first_name', 'There must be no special characters in the first name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('last_name', 'There must be no special characters in the last name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('phone', 'Phone number must include 11 digits')
    .isLength({min:11, max:11})
], async (req, res) => {
  const user_id = req.user._id
  const { email, first_name, last_name, birthday, bio, sex, status, phone } = req.body
  const errors = validationResult(req)
    if(!errors.isEmpty()) {
        const alert = errors.array()
        const user_id = req.user._id
        if (req.user.usertype == "patient") {
          const users = await User.findById(user_id)
          res.render('patient/settings.ejs', { patient: users,
            alert, base: 'base64' })
        }
        else if (req.user.usertype == "doctor") {
          const users = await Doctor.findById(user_id)
          res.render('doctor/settings.ejs', { doctor: users,
            alert, base: 'base64' })
        }
        else if (req.user.usertype == "staff") {
          const users = await Staff.findById(user_id)
          res.render('staff/settings.ejs', { staff: users,
            alert, base: 'base64' })
        }
        else if (req.user.usertype == "admin") {
          const users = await Admin.findById(user_id)
          res.render('admin/settings.ejs', { admin: users,
            alert, base: 'base64' })
        }
    }
    else{
        let n = Date.now();
        let d = new Date(birthday);
        try {
          if (req.user.usertype == "patient") {
            const user = await User.findById(user_id)
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.birthday = birthday
            user.age = getYears(n - d)
            user.sex = sex
            user.status = status
            user.phone = phone
            user.bio = bio
            await user.save()
            const response = user
            res.redirect('/profile')
            console.log('User updated successfully: ', response)
          }  
          else if (req.user.usertype == "doctor") {
            const doctor = await Doctor.findById(user_id)
            doctor.email = email
            doctor.first_name = first_name
            doctor.last_name = last_name
            doctor.birthday = birthday
            doctor.age = getYears(n - d)
            doctor.sex = sex
            doctor.status = status
            doctor.phone = phone
            doctor.bio = bio
            await doctor.save()
            const response = doctor
            res.redirect('/profile')
            console.log('User updated successfully: ', response)
          }
          else if (req.user.usertype == "staff") {
            const staff = await Staff.findById(user_id)
            staff.email = email
            staff.first_name = first_name
            staff.last_name = last_name
            staff.birthday = birthday
            staff.age = getYears(n - d)
            staff.sex = sex
            staff.status = status
            staff.phone = phone
            staff.bio = bio
            await staff.save()
            const response = staff
            res.redirect('/profile')
            console.log('User updated successfully: ', response)
          }
          else if (req.user.usertype == "admin") {
            const admin = await Admin.findById(user_id)
            admin.email = email
            admin.first_name = first_name
            admin.last_name = last_name
            admin.birthday = birthday
            admin.age = getYears(n - d)
            admin.sex = sex
            admin.status = status
            admin.phone = phone
            admin.bio = bio
            await admin.save()
            const response = admin
            res.redirect('/profile')
            console.log('User updated successfully: ', response)
          }
          
        } catch {
          res.redirect("/dashboard")
        }
        
      
    }
    
  
})

app.put('/approve-appointment', checkAuthenticated, async (req, res) => {
    const user_id = req.body._id
    let date_ob = new Date();
let set_date = ("0" + date_ob.getDate()).slice(-2);
let year = date_ob.getFullYear();
let hours = date_ob.getHours();
let min = ("0" + date_ob.getMinutes()).slice(-2);
var midday = "AM";
midday = (hours >= 12) ? "PM" : "AM"; /* assigning AM/PM */
hours = (hours == 0) ? 12 : ((hours > 12) ? (hours - 12): hours);
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const approved_time = hours + ":" + min + " " + midday
const approved_date = monthNames[date_ob.getMonth()] + " " + set_date + ", " + year
const approved_staff = req.user.first_name + " " + req.user.last_name
    try {
      const approve = await Appointment.findById(user_id)
      const response = new Appointment({
        id: approve.id,
        img_id: approve.img_id,
        first_name: approve.first_name,
        last_name: approve.last_name,
        branch: approve.branch,
        time: approve.time,
        date: approve.date,
        exp_symptoms: approve.exp_symptoms,
        date_timestamp: approve.date_timestamp,
        time_timestamp: approve.time_timestamp,
        age: approve.age,
        sex: approve.sex,
        status: approve.status,
        phone: approve.phone,
        email: approve.email,
        symptoms_detected: approve.symptoms_detected,
        pre_diagnose_result: approve.pre_diagnose_result,
        appointment_status: "Approved",
        approved_time,
        approved_date,
        approved_staff
    })
await response.save()
const delete_response = await Appointment.deleteOne({_id: user_id})
res.redirect('/appointments')
console.log('Pending appointment deleted successfully: ', delete_response)
console.log('Appointment approved successfully: ', response)
      
      
    } catch (err) {
      const user_id = req.user._id
      const users = await Staff.findById(user_id)
      const patient = await User.find();
      const appointments = await Appointment.find()
      res.render('staff/appointments.ejs', { appointment: appointments,
        patients: patient, staff: users,
        alert: err, base: 'base64' })
    }
        
  
})

app.put('/edit-info', checkAuthenticated, urlencodedParser,[
  check('first_name', 'There must be no special characters in the first name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
  check('last_name', 'There must be no special characters in the last name')
    .matches(/^[A-Za-z0-9 .,'!&]+$/),
    check('phone', 'Phone number must include 11 digits')
    .isLength({min:11, max:11}),
  check('email', 'Email is not valid')
    .isEmail()
    .normalizeEmail()
], async (req, res) => {
  const { email, first_name, last_name, birthday, bio, sex, status, phone, _id, usertype} = req.body
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    const alert = errors.array()
    const user_id = req.user._id
    const doc = await Doctor.find();
    const admins = await Admin.findById(user_id)
    res.render('admin/doctors.ejs', { doctors: doc, alert, admin: admins, base: 'base64' })
    return
  }
  try {
    let n = Date.now();
    let d = new Date(birthday);
    if (usertype == "doctor") {
      const doctor = await Doctor.findById(_id)
      doctor.email = email
      doctor.first_name = first_name
      doctor.last_name = last_name
      doctor.birthday = birthday
      doctor.age = getYears(n - d)
      doctor.sex = sex
      doctor.status = status
      doctor.phone = phone
      doctor.bio = bio
      await doctor.save()
      const response = doctor
      res.redirect('/doctors')
      console.log('Doctor information updated successfully: ', response) 
    } else if (usertype == "staff") {
      const staff = await Staff.findById(_id)
      staff.email = email
      staff.first_name = first_name
      staff.last_name = last_name
      staff.birthday = birthday
      staff.age = getYears(n - d)
      staff.sex = sex
      staff.status = status
      staff.phone = phone
      staff.bio = bio
      await staff.save()
      const response = staff
      res.redirect('/staffs')
      console.log('staff information updated successfully: ', response) 
    }
    else{
      console.log("Usertype not found")
      res.redirect('/dashboard')
    }
  } catch {
    res.redirect('/dashboard')
  }
})

app.put('/edit-doctor-roles', checkAuthenticated, async (req, res) => {
  const doc = new Doctor();
  if (req.body.specialization) {
    doc.specialization = Array.isArray(req.body.specialization) ? req.body.specialization : [req.body.specialization]; 
  }
  const { specialization, branch, _id } = req.body
  try {
    const doctor = await Doctor.findById(_id)
    doctor.specialization = specialization
    doctor.branch = branch
    await doctor.save()
    const response = doctor
    res.redirect('/doctors')
    console.log('Doctor roles updated successfully: ', response) 
  } catch {
    res.redirect("/dashboard")
  }
})

app.put('/edit-staff-role', checkAuthenticated, async (req, res) => {
  const { branch, _id } = req.body
  try {
    const staff = await Staff.findById(_id)
    staff.branch = branch
    await staff.save()
    const response = staff
    res.redirect('/staffs')
    console.log('Staff role updated successfully: ', response) 
  } catch {
    res.redirect("/dashboard")
  }
})

app.post('/deactivate', checkAuthenticated, async (req, res) => {
  const { usertype, id } = req.body
  try {
    if (usertype == "doctor") {
      const doctor = await Doctor.deleteOne({id: id})
      const response = doctor
      res.redirect('/doctors')
      console.log('Doctor removed successfully: ', response) 
    }
    else if (usertype == "staff") {
      const staff = await Staff.deleteOne({id: id})
      const response = staff
      res.redirect('/staffs')
      console.log('Staff removed successfully: ', response) 
    }
    else if (usertype == "patient") {
      const patient = await User.deleteOne({id: id})
      const response = patient
      res.redirect('/patients')
      console.log('Patient removed successfully: ', response) 
    }
    else if (req.user.usertype == "staff" || req.user.usertype == "doctor") {
      const appointment = await Appointment.deleteOne({id: id})
      const response = appointment
      res.redirect('/appointments')
      console.log('Appointment removed successfully: ', response) 
    }
    else{
      console.log("Usertype not found")
      res.redirect("/dashboard")
    }
    
  } catch {
    res.redirect("/dashboard")
  }
})

app.put('/edit-security', checkAuthenticated,urlencodedParser,[
  check('password', 'Password must include one lowercase character, one uppercase character, a number, and a special character.')
  .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i"),
  check('password', 'Password must be greater than 5 characters.')
  .isLength({min:6}),
  check('confirm_password')
    .custom(async (confirm_password, {req}) => {
      const password = req.body.password
      if(password !== confirm_password){
        throw new Error('Passwords must be same')
      }
    }),
  check('old_password')
    .custom(async (old_password, {req}) => {
      const password = req.body.old_pass
      const checker = await bcrypt.compare(old_password, password)
      if (checker == false) {
        throw new Error('Old Password not matched')
      }
    }),
],
  async (req, res) => {
  const { password: plainTextPassword, _id , usertype} = req.body
  const password = await bcrypt.hash(plainTextPassword, 10)
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    if (usertype == "doctor" && req.user.usertype == "admin") {
      const alert = errors.array()
      const user_id = req.user._id
      const doc = await Doctor.find();
      const admins = await Admin.findById(user_id)
      res.render('admin/doctors.ejs', { doctors: doc, alert, admin: admins, base: 'base64' })
    }
    else if (usertype == "staff" && req.user.usertype == "admin") {
      const alert = errors.array()
      const user_id = req.user._id
      const staffs = await Staff.find();
      const admins = await Admin.findById(user_id)
      res.render('admin/staffs.ejs', { staff: staffs, alert, admin: admins, base: 'base64' })
    } else if (req.user.usertype == "doctor") {
      const alert = errors.array()
      const user_id = req.user._id
      const doc = await Doctor.find();
      const doctors = await Doctor.findById(user_id)
      res.render('doctor/settings.ejs', { doctors: doc, alert, doctor: doctors, base: 'base64' })
    }
    else if (req.user.usertype == "staff") {
      const alert = errors.array()
      const user_id = req.user._id
      const staffs = await Staff.findById(user_id)
      res.render('staff/settings.ejs', { staff: staffs, alert, staff: staffs, base: 'base64' })
    }
    else if (req.user.usertype == "patient") {
      const alert = errors.array()
      const user_id = req.user._id
      const user = await User.findById(user_id)
      res.render('patient/settings.ejs', { patient: user, alert, base: 'base64' })
    }
    else if (req.user.usertype == "admin" && usertype == "admin") {
      const alert = errors.array()
      const user_id = req.user._id
      const admins = await Admin.findById(user_id)
      res.render('admin/settings.ejs', { admin: admins, alert, base: 'base64' })
    }
    else{
      res.redirect("/dashboard")
    }
    return
  }
    if (usertype == "doctor") {
      const doctor = await Doctor.findById(_id)
      doctor.password = password
      await doctor.save()
      const response = doctor
      res.redirect('/doctors')
      console.log('Doctor password updated successfully: ', response) 
    }
    else if (usertype == "staff") {
      const staff = await Staff.findById(_id)
      staff.password = password
      await staff.save()
      const response = staff
      res.redirect('/staffs')
      console.log('Staff password updated successfully: ', response) 
    }
    else if (req.user.usertype == "doctor") {
      const doctor = await Doctor.findById(_id)
      doctor.password = password
      await doctor.save()
      const response = doctor
      res.redirect('/profile')
      console.log('Doctor password updated successfully: ', response) 
    }
    else if (req.user.usertype == "staff") {
      const staff = await Staff.findById(_id)
      staff.password = password
      await staff.save()
      const response = staff
      res.redirect('/profile')
      console.log('Staff password updated successfully: ', response) 
    }
    else if (usertype == "admin") {
      const admin = await Admin.findById(_id)
      admin.password = password
      await admin.save()
      const response = admin
      res.redirect('/profile')
      console.log('Admin password updated successfully: ', response) 
    }
    else if (usertype == "patient") {
      const patient = await User.findById(_id)
      patient.password = password
      await patient.save()
      const response = patient
      res.redirect('/profile')
      console.log('Patient password updated successfully: ', response) 
    }
    else{
      console.log("Usertype not found")
      res.redirect("/dashboard")
    }
})

app.put('/cancel-appointment', checkAuthenticated, async (req, res) => {
  const user_id = req.body._id
  let date_ob = new Date();
  let set_date = ("0" + date_ob.getDate()).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let min = ("0" + date_ob.getMinutes()).slice(-2)
  var midday = "AM";
  midday = (hours >= 12) ? "PM" : "AM"; /* assigning AM/PM */
  hours = (hours == 0) ? 12 : ((hours > 12) ? (hours - 12): hours);
  const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
  ];
  const time_cancelled = hours + ":" + min + " " + midday
  
  const date_cancelled = monthNames[date_ob.getMonth()] + " " + set_date + ", " + year
  try {
    const cancel = await Appointment.findById(user_id)
    const cancelled_by = cancel.first_name + " " + cancel.last_name
      const response = new Appointment({
        id: cancel.id,
        img_id: cancel.img_id,
        first_name: cancel.first_name,
        last_name: cancel.last_name,
        branch: cancel.branch,
        time: cancel.time,
        date: cancel.date,
        exp_symptoms: cancel.exp_symptoms,
        date_timestamp: cancel.date_timestamp,
        time_timestamp: cancel.time_timestamp,
        age: cancel.age,
        sex: cancel.sex,
        status: cancel.status,
        phone: cancel.phone,
        email: cancel.email,
        symptoms_detected: cancel.symptoms_detected,
        pre_diagnose_result: cancel.pre_diagnose_result,
        appointment_status: "Cancelled",
        approved_staff: cancel.approved_staff,
        time_cancelled,
        date_cancelled,
        cancelled_by
    })
await response.save()
const cancel_response = await Appointment.deleteOne({_id: user_id})
res.redirect('/appointments')
console.log('Pending or Approved Appointment deleted successfully: ', cancel_response)
console.log('Appointment cancelled successfully: ', response)
    
    
  } catch (err) {
    const user_id = req.user._id
    const users = await User.findById(user_id)
    Appointment.countDocuments({img_id: req.user.id}, function (err, total) {
      if (err){
          console.log(err)
      }else{
        Diagnose.countDocuments({img_id:req.user.id}, function (err, diagnosed) {
          if (err){
              console.log(err)
          }else{
            res.render('patient/dashboard.ejs', { alert: err, diagnose: diagnosed , total: total, patient: users, base: 'base64' })
          }
        })
      }
    })
  }
      

})

const BranchStorage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, "public/uploads");
  },
  filename: function (req, file, callback) {
    const temp = Date.now()
    const name = 'branch' + temp
    callback(null, name+'.png');
  }
});

const branchUpload = multer({ storage: BranchStorage })

app.post('/add-branch', branchUpload.single('branchUpload'), checkAuthenticated, 
async (req, res) => {
  const branch = new Branch();
  if (req.body.assigned_doctor) {
    branch.assigned_doctor = Array.isArray(req.body.assigned_doctor) ? req.body.assigned_doctor : [req.body.assigned_doctor]; 
  }
  if (req.body.assigned_staffs) {
    branch.assigned_staffs = Array.isArray(req.body.assigned_staffs) ? req.body.assigned_staffs : [req.body.assigned_staffs]; 
  }
  if (req.body.set_time) {
    branch.set_time = Array.isArray(req.body.set_time) ? req.body.set_time : [req.body.set_time]; 
  }
  const { branch_name, address, set_time, assigned_doctor, assigned_staffs, phone } = req.body
  console.log(branch_name, address, set_time, assigned_doctor, assigned_staffs, phone)
      try{
        const response = new Branch({
                id: Date.now().toString(),
                branch_name,
                address,
                set_time, 
                assigned_doctor,
                assigned_staffs,
                phone,
                img : {
                  data: fs.readFileSync(path.join(__dirname + "/public/uploads/" + req.file.filename)),
                  contentType: 'image/png'
                }
            })
      await response.save()
      res.redirect('/branches')
      console.log('User created successfully: ', response)
    } catch (err){
      res.redirect('/dashboard')
      console.log(err)
    }
    
})

const Storage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, "public/uploads");
  },
  filename: function (req, file, callback) {
    const temp = req.user.id
    const name = temp.toString()
    callback(null, name+'.png');
  }
});

const upload = multer({ storage: Storage })

app.put('/change-profile-picture', upload.single('imageUpload'),checkAuthenticated, async (req, res) => {
  const user_id = req.user._id
  try {
    if (req.user.usertype == "patient") {
      const user = await User.findById(user_id)
      user.img = {
        data: fs.readFileSync(path.join(__dirname + "/public/uploads/" + req.file.filename)),
        contentType: 'image/png'
      }
      await user.save()
      const response = user
      res.redirect('/profile')
      console.log('Profile image updated successfully: ', response)
    }  
    else if (req.user.usertype == "doctor") {
      const doctor = await Doctor.findById(user_id)
      doctor.img = {
        data: fs.readFileSync(path.join(__dirname + "/public/uploads/" +req.file.filename)),
        contentType: 'image/png'
      }
      await doctor.save()
      const response = doctor
      res.redirect('/profile')
      console.log('Profile image updated successfully: ', response)
    }
    else if (req.user.usertype == "staff") {
      const staff = await Staff.findById(user_id)
      staff.img = {
        data: fs.readFileSync(path.join(__dirname + "/public/uploads/" +req.file.filename)),
        contentType: 'image/png'
      }
      await staff.save()
      const response = staff
      res.redirect('/profile')
      console.log('Profile image updated successfully: ', response)
    }
    else if (req.user.usertype == "admin") {
      const admin = await Admin.findById(user_id)
      admin.img = {
        data: fs.readFileSync(path.join(__dirname + "/public/uploads/" +req.file.filename)),
        contentType: 'image/png'
      }
      await admin.save()
      const response = admin
      res.redirect('/profile')
      console.log('Profile image updated successfully: ', response)
    }
    
    
  } catch (err) {
      const user_id = req.user._id
      if (req.user.usertype == "patient") {
        const users = await User.findById(user_id)
        res.render('patient/settings.ejs', { 
          patient: users, alert: err, base: 'base64'
            })
      } else if (req.user.usertype == "doctor") {
        const users = await Doctor.findById(user_id)
        res.render('doctor/settings.ejs', { 
          doctor: users, alert: err, base: 'base64'
            })
      } else if (req.user.usertype == "staff") {
        const users = await Staff.findById(user_id)
        res.render('staff/settings.ejs', { 
          staff: users, alert: err, base: 'base64'
            })
      } else if (req.user.usertype == "admin") {
        const users = await Admin.findById(user_id)
        res.render('admin/settings.ejs', { 
          admin: users, alert: err, base: 'base64'
            })
      } else { 
        res.render('404.ejs')
      }
  }
      

})

app.post('/set-appointment', checkAuthenticated, async (req, res) => {
  const appointment = new Appointment();
  if (req.body.exp_symptoms) {
    appointment.exp_symptoms = Array.isArray(req.body.exp_symptoms) ? req.body.exp_symptoms : [req.body.exp_symptoms]; 
  }
  const {time, exp_symptoms, branch} = req.body
  const {email, first_name, last_name, phone, sex, status, age } = req.user
  var covid19symptoms = ['Headache', 'Fever', 'Cough', 'Tiredness', 'Loss of Taste or Smell', 'Sore Throat', 'Aches and Pains', 'Diarrhoea', 'Shortness of breath', 'Fatigue'];

  const temp_date = req.body.date
  
  if (!Date.parse(temp_date) || !time) {
    const alert = "Please input a day and time of your appointment."
    const patients = await User.findById(req.user._id) 
    const branches = await Branch.find()
    const appointments = await Appointment.find()
    res.render('patient/set-appointment.ejs',{ alert: alert, appointment: appointments, branch: branches, patient: patients, base: 'base64'})
    console.log(alert)
  } else {
    console.log(exp_symptoms)
    function checkSymptom(value, arr) {
      var status = 'Not Detected';
  
      for (var i = 0; i < arr.length; i++) {
          var name = arr[i];
          if (name == value) {
              status = 'Detected';
              break;
          }
      }
  
      return status;
    }
    var covid_status = 0
    var pre_diagnose_result = " "
    console.log(Array.isArray(exp_symptoms))
    if (Array.isArray(exp_symptoms) == true) {
      exp_symptoms.forEach(function(el, i) {
        const covid_symptom_checker = checkSymptom(exp_symptoms[i], covid19symptoms) 
        if (covid_symptom_checker == "Detected") {
          covid_status += 1
          console.log(covid_status," Symptom ",checkSymptom(exp_symptoms[i], covid19symptoms), " for COVID-19 ", "| ",exp_symptoms[i])
        }
      })
    } else {
      console.log(exp_symptoms)
    }
    const symptoms_detected = covid_status
    if (covid_status > 2) {
      pre_diagnose_result = "Possible COVID-19"
      covid_status = 0
    }
    else{
      pre_diagnose_result = "Not COVID-19"
      covid_status = 0
    }
          try{
            
            var input_date = " "
            temp_date.forEach(function(el, i) {
              if (temp_date[i] != "") {
                input_date = temp_date[i]
              }
            });
            const id = req.user._id
            const img_id = req.user.id
            const appointment_status = "Pending"
            let date_ob = new Date();
            let set_date = ("0" + date_ob.getDate()).slice(-2);
            let year = date_ob.getFullYear();
            let hours = date_ob.getHours();
            let min = ("0" + date_ob.getMinutes()).slice(-2);
            var b = input_date.split(/\D/);
            var date_temp = new Date(b[0], --b[1], b[2]);
            let set_date_appointment = ("0" + date_temp.getDate()).slice(-2);
            let year_appointment = date_temp.getFullYear();
            var midday = "AM";
            midday = (hours >= 12) ? "PM" : "AM"; /* assigning AM/PM */
            hours = (hours == 0) ? 12 : ((hours > 12) ? (hours - 12): hours); /* assigning hour in 12-hour format */
  
            const time_timestamp = hours + ":" + min + " " + midday
            const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const date_timestamp = monthNames[date_ob.getMonth()] + " " + set_date + ", " + year
    const date = monthNames[date_temp.getMonth()] + " " + set_date_appointment + ", " + year_appointment
            const response = new Appointment({
                    id,
                    img_id,
                    first_name,
                    last_name,
                    branch,
                    time,
                    date,
                    exp_symptoms,
                    date_timestamp,
                    time_timestamp,
                    age,
                    sex,
                    status,
                    phone,
                    email,
                    symptoms_detected,
                    pre_diagnose_result,
                    appointment_status
                })
          await response.save()
          res.redirect('/appointments')
          console.log('Appointment created successfully: ', response)
        } catch (err) {
            res.redirect('/dashboard')
            console.log(err)
        }

  }

  
    
  
})

app.post('/diagnose-patient', checkAuthenticated, async (req, res) => {
  const {id, img_id, first_name, last_name, branch, date, time, sex, age, status, phone, email, exp_symptoms, pre_diagnose_result, diagnosed_disease, medicine, laboratory, approved_staff, next_checkup, next_checkup_note, notes} = req.body
      try{
        let date_ob = new Date();
        let set_date = ("0" + date_ob.getDate()).slice(-2);
        let year = date_ob.getFullYear();
        let hours = date_ob.getHours();
        let min = ("0" + date_ob.getMinutes()).slice(-2);
        var midday = "AM";
		    midday = (hours >= 12) ? "PM" : "AM"; /* assigning AM/PM */
		    hours = (hours == 0) ? 12 : ((hours > 12) ? (hours - 12): hours); /* assigning hour in 12-hour format */
        const time_timestamp = hours + ":" + min + " " + midday
        const monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
        const date_timestamp = monthNames[date_ob.getMonth()] + " " + set_date + ", " + year
        var appointment_status = " "
        console.log(next_checkup)
        if (next_checkup == "Yes") {
          appointment_status = "Follow-Up"
        } else {
          appointment_status = "Done"
        }

        const response = new Diagnose({
                id,
                img_id,
                first_name,
                last_name,
                branch,
                time,
                date,
                exp_symptoms,
                date_timestamp,
                time_timestamp,
                age,
                sex,
                status,
                phone,
                email,
                approved_staff,
                pre_diagnose_result,
                appointment_status,
                laboratory,
                medicine,
                diagnosed_disease,
                next_checkup_note,
                next_checkup,
                notes
            })
      await response.save()
      const doctors = await Doctor.findById(req.user._id)
      const appointments = await Appointment.find()
      res.render('doctor/appointments.ejs', { appointment: appointments, doctor: doctors, patients: patient, base: 'base64', msg: "Patient successfully diagnosed", type: "success"})
      const delete_response = await Appointment.deleteOne({id: id})
      console.log( first_name," ",last_name,' appointment has been deleted successfully: ', delete_response)
      console.log( first_name," ",last_name,' has been diagnosed successfully: ', response)
    } catch (err) {
        res.redirect('/dashboard')
        console.log(err)
    }
  
})

app.put('/follow-up-diagnose', checkAuthenticated, async (req, res) => {
  const {id, img_id, first_name, last_name, branch, date, time, sex, age, status, phone, email, exp_symptoms, pre_diagnose_result, diagnosed_disease, medicine, laboratory, approved_staff, next_checkup, next_checkup_note, notes} = req.body
      try{
        let date_ob = new Date();
        let set_date = ("0" + date_ob.getDate()).slice(-2);
        let year = date_ob.getFullYear();
        let hours = date_ob.getHours();
        let min = ("0" + date_ob.getMinutes()).slice(-2);
        var midday = "AM";
		    midday = (hours >= 12) ? "PM" : "AM"; /* assigning AM/PM */
		    hours = (hours == 0) ? 12 : ((hours > 12) ? (hours - 12): hours); /* assigning hour in 12-hour format */
        const time_timestamp = hours + ":" + min + " " + midday
        const monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
        const date_timestamp = monthNames[date_ob.getMonth()] + " " + set_date + ", " + year
        var appointment_status = " "
        console.log(next_checkup)
        if (next_checkup == "Yes") {
          appointment_status = "Follow-Up"
        } else {
          appointment_status = "Done"
        }

        const response = new Diagnose({
                id,
                img_id,
                first_name,
                last_name,
                branch,
                time,
                date,
                exp_symptoms,
                date_timestamp,
                time_timestamp,
                age,
                sex,
                status,
                phone,
                email,
                approved_staff,
                pre_diagnose_result,
                appointment_status,
                laboratory,
                medicine,
                diagnosed_disease,
                next_checkup_note,
                next_checkup,
                notes
            })
            
      if (next_checkup == "No") {
        const records = await Diagnose.find({id:id})
        for (let i = 0; i < records.length; i++) {
          records[i].appointment_status = "Done"
          await records[i].save()
        }
        console.log(records)
      }
      await response.save()
      const doctors = await Doctor.findById(req.user._id)
      const diagnosis = await Diagnose.find()
      res.render('doctor/records.ejs', { diagnose: diagnosis, doctor: doctors, base: 'base64' , msg: "Patient sucessfully diagnosed", type: "alert-success"})
      console.log( first_name," ",last_name,' has been diagnosed successfully: ', response)
    } catch (err) {
      const user_id = req.user._id
      const doctors = await Doctor.findById(user_id)
      Appointment.countDocuments({branch:req.user.branch, appointment_status: "Approved"}, function (err, count) {
            if (err){
                console.log(err)
            }else{
              res.render('doctor/dashboard.ejs', { appointment: count, doctor: doctors, base: 'base64', msg: err, type: "alert"})
            }
          })
        console.log(err)
    }
  
})


app.post('/patient-login', checkNotAuthenticated, passport.authenticate('patient-local', {
  successRedirect: '/dashboard',
  failureRedirect: '/patient-login',
  failureFlash: true
}))

app.post('/admin-login', checkNotAuthenticated, passport.authenticate('admin-local', {
  successRedirect: '/dashboard',
  failureRedirect: '/admin-login',
  failureFlash: true
}))

app.post('/staff-login', checkNotAuthenticated, passport.authenticate('staff-local', {
  successRedirect: '/dashboard',
  failureRedirect: '/staff-login',
  failureFlash: true
}))

app.post('/doctor-login', checkNotAuthenticated, passport.authenticate('doctor-local', {
  successRedirect: '/dashboard',
  failureRedirect: '/doctor-login',
  failureFlash: true
}))

app.delete('/logout', async (req, res) => {
  req.logOut()
  res.redirect('/')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/')
}

function checkNotAuthenticated(req, res, next) {
if (req.isAuthenticated()) {
  return res.redirect('/dashboard')
}
next()
}

app.get('*', function(req, res){
  res.status(404).render('404.ejs');
});





app.listen(process.env.PORT || 3000)
