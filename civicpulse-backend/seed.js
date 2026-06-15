/**
 * CivicPulse — Prisma Seeder
 * Run: npx prisma db push && node seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CivicPulse database...\n');

  // Admin
  const adminPwd = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@civicpulse.in' }, update: {},
    create: { name:'Admin User', email:'admin@civicpulse.in', phone:'9940000001', password:adminPwd, blood_group:'O+', role:'admin' }
  });
  console.log('✅ Admin: admin@civicpulse.in / Admin@123');

  // Citizens
  const pwd = await bcrypt.hash('Test@123', 10);
  const citizens = [
    { name:'Arjun Kumar',   email:'arjun@example.com',   phone:'9940000101', blood_group:'A+' },
    { name:'Priya Devi',    email:'priya@example.com',   phone:'9940000102', blood_group:'B+' },
    { name:'Rajan Mohan',   email:'rajan@example.com',   phone:'9940000103', blood_group:'O+' },
    { name:'Kavitha Singh', email:'kavitha@example.com', phone:'9940000104', blood_group:'AB+' },
  ];
  for (const c of citizens) {
    await prisma.user.upsert({ where:{email:c.email}, update:{}, create:{...c,password:pwd} });
  }
  console.log(`✅ ${citizens.length} demo citizens (password: Test@123)`);

  // Blood Donors
  await prisma.bloodDonor.deleteMany();
  await prisma.bloodDonor.createMany({ data: [
    { name:'Suresh Kumar', blood_group:'O+', phone:'9940101001', city:'Cuddalore', last_donated:'2 months ago', available:true },
    { name:'Priya Devi',   blood_group:'A+', phone:'9940101002', city:'Cuddalore', last_donated:'1 month ago',  available:true },
    { name:'Rajan M.',     blood_group:'B+', phone:'9940101003', city:'Cuddalore', last_donated:'3 months ago', available:true },
    { name:'Kavitha S.',   blood_group:'AB+',phone:'9940101004', city:'Cuddalore', last_donated:'5 months ago', available:true },
    { name:'Dinesh R.',    blood_group:'O-', phone:'9940101005', city:'Cuddalore', last_donated:'6 months ago', available:false },
    { name:'Anitha P.',    blood_group:'A-', phone:'9940101006', city:'Cuddalore', last_donated:'1 month ago',  available:true },
    { name:'Murali T.',    blood_group:'B-', phone:'9940101007', city:'Cuddalore', last_donated:'4 months ago', available:true },
    { name:'Selvi K.',     blood_group:'AB-',phone:'9940101008', city:'Cuddalore', last_donated:'2 months ago', available:true },
    { name:'Venkat N.',    blood_group:'O+', phone:'9940101009', city:'Cuddalore', last_donated:'3 months ago', available:true },
    { name:'Sangeetha B.', blood_group:'A+', phone:'9940101010', city:'Cuddalore', last_donated:'2 months ago', available:true },
    { name:'Ramesh G.',    blood_group:'B+', phone:'9940101011', city:'Cuddalore', last_donated:'7 months ago', available:false },
    { name:'Nithya C.',    blood_group:'O+', phone:'9940101012', city:'Cuddalore', last_donated:'1 month ago',  available:true },
  ]});
  console.log('✅ 12 blood donors');

  // Volunteers
  await prisma.volunteer.deleteMany();
  await prisma.volunteer.createMany({ data: [
    { name:'Sunita Patel', age:28, email:'sunita@example.com',  phone:'9940201001', area:'Food Distribution', availability:'Weekends only',    hours_logged:45 },
    { name:'Karthik Raja', age:32, email:'karthik@example.com', phone:'9940201002', area:'Medical Aid',        availability:'Weekday evenings', hours_logged:30 },
    { name:'Ananya Menon', age:25, email:'ananya@example.com',  phone:'9940201003', area:'Education Support',  availability:'Weekends only',    hours_logged:22 },
    { name:'Bharath S.',   age:35, email:'bharath@example.com', phone:'9940201004', area:'Disaster Relief',    availability:'Emergency only',   hours_logged:15, status:'inactive' },
    { name:'Latha Devi',   age:42, email:'latha@example.com',   phone:'9940201005', area:'Elder Care',         availability:'Full-time',        hours_logged:80 },
  ]});
  console.log('✅ 5 volunteers');

  // Issues
  await prisma.issue.deleteMany();
  const issuesRaw = [
    { category:'garbage',     name:'Rajan Kumar', phone:'9940301', location:'MG Road',         description:'Garbage pile not cleared for 3 days.',   status:'resolved' },
    { category:'road',        name:'Priya M.',    phone:'9940302', location:'Anna Nagar',       description:'Deep pothole causing accidents.',          status:'in_progress' },
    { category:'streetlight', name:'Kavitha R.',  phone:'9940303', location:'Gandhi Road',      description:'Streetlight non-functional for 2 weeks.', status:'pending' },
    { category:'water',       name:'Arjun Raj',   phone:'9940304', location:'Netaji Street',    description:'Water pipe leaking near school gate.',    status:'resolved' },
    { category:'sewer',       name:'Meena S.',    phone:'9940305', location:'Market Street',    description:'Sewer overflow causing health hazard.',   status:'in_progress' },
    { category:'road',        name:'Dinesh T.',   phone:'9940306', location:'Port Road',        description:'Road broken after rain, no repair done.', status:'pending' },
  ];
  for (let i = 0; i < issuesRaw.length; i++) {
    await prisma.issue.create({ data: { ...issuesRaw[i], ticket_no:'CP'+String(i+1).padStart(4,'0') } });
  }
  console.log(`✅ ${issuesRaw.length} sample issues`);

  // Hospitals
  await prisma.hospital.deleteMany();
  await prisma.hospital.createMany({ data: [
    { name:'Government General Hospital', type:'Government',   address:'Gandhi Road, Cuddalore',      phone:'04142-220100', beds:200, open_24h:true  },
    { name:'PHC — Anna Nagar',            type:'Primary Health',address:'Anna Nagar, Cuddalore',      phone:'04142-221200', beds:30,  open_24h:false },
    { name:'District Blood Bank',         type:'Blood Bank',   address:'Hospital Road, Cuddalore',    phone:'04142-220500', beds:0,   open_24h:false },
    { name:'CMCHIS Specialty Hospital',   type:'Specialty',    address:'Nellikuppam Road, Cuddalore', phone:'04142-230100', beds:120, open_24h:true  },
    { name:'Child Welfare Centre',        type:'Paediatric',   address:'Cuddalore Port Road',         phone:'04142-222300', beds:50,  open_24h:false },
    { name:'Mental Health Resource',      type:'Mental Health',address:'Cuddalore Town',              phone:'04142-225000', beds:40,  open_24h:false },
  ]});
  console.log('✅ 6 hospitals');

  // Schemes
  await prisma.scheme.deleteMany();
  await prisma.scheme.createMany({ data: [
    { title:'PM Awas Yojana (Urban)',  category:'Housing',    description:'Affordable housing subsidy up to ₹2.5 lakh.', apply_link:'https://pmaymis.gov.in', deadline:'2026-06-30' },
    { title:'Ayushman Bharat PMJAY',   category:'Health',     description:'Free healthcare up to ₹5 lakh/year.',          apply_link:'https://pmjay.gov.in'   },
    { title:'PM Scholarship Scheme',   category:'Education',  description:'₹2,500–₹3,000/month for ex-servicemen children.', apply_link:'https://ksb.gov.in', deadline:'2026-05-31' },
    { title:'Beti Bachao Beti Padhao', category:'Women',      description:'Empowerment of girl child through education.',   apply_link:'https://wcd.nic.in'    },
    { title:'PM-KISAN Samman Nidhi',   category:'Agriculture',description:'₹6,000/year direct support to farmers.',         apply_link:'https://pmkisan.gov.in'},
    { title:'Swachh Bharat Mission',   category:'Sanitation', description:'Clean India — universal sanitation coverage.',    apply_link:'https://swachhbharat.mygov.in'},
  ]});
  console.log('✅ 6 schemes');

  // Notifications
  await prisma.notification.createMany({ data: [
    { user_id:admin.id, title:'New Issue Reported',     message:'Pothole reported on Anna Nagar Road.',   type:'warning' },
    { user_id:admin.id, title:'Volunteer Registration', message:'New volunteer registered: Sunita Patel.',type:'success' },
    { user_id:admin.id, title:'Blood Donor Added',      message:'New O+ donor registered.',               type:'info'    },
    { user_id:admin.id, title:'Issue Resolved',         message:'Garbage issue CP0001 resolved.',         type:'success' },
  ]});
  console.log('✅ 4 notifications');

  console.log('\n✨ Seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin: admin@civicpulse.in / Admin@123');
  console.log('User:  arjun@example.com   / Test@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
