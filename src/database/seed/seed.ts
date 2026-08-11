/**
 * Development-only seed script. Creates a single demo company with one
 * ADMIN user so the app can be logged into on a fresh database.
 *
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import loadConfig from '../../config/configuration';

import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import { Role, RoleSchema } from '../../modules/roles/schemas/role.schema';
import {
  Company,
  CompanySchema,
} from '../../modules/companies/schemas/company.schema';
import {
  CompanyMember,
  CompanyMemberSchema,
} from '../../modules/company-members/schemas/company-member.schema';
import { DEFAULT_ROLE_PERMISSIONS } from '../../modules/permissions/permissions.constants';

const MONGODB_URI = loadConfig().app.mongodbUri;

const COMPANY_STATE = 'Tamil Nadu';
const COMPANY_STATE_CODE = '33';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI}`);

  const UserModel = mongoose.model(User.name, UserSchema);
  const RoleModel = mongoose.model(Role.name, RoleSchema);
  const CompanyModel = mongoose.model(Company.name, CompanySchema);
  const CompanyMemberModel = mongoose.model(
    CompanyMember.name,
    CompanyMemberSchema,
  );

  console.log('Clearing existing demo data...');
  await Promise.all([
    UserModel.deleteMany({}),
    RoleModel.deleteMany({}),
    CompanyModel.deleteMany({}),
    CompanyMemberModel.deleteMany({}),
  ]);

  // --- Company ---
  const company = await CompanyModel.create({
    slug: 'demo-traders',
    name: 'Demo Traders Pvt Ltd',
    legalName: 'Demo Traders Private Limited',
    address: {
      line1: '12 Anna Salai',
      city: 'Chennai',
      state: COMPANY_STATE,
      stateCode: COMPANY_STATE_CODE,
      country: 'India',
      pincode: '600002',
    },
    phone: '+91-44-12345678',
    email: 'accounts@demotraders.example',
    gstin: '33ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    financialYearStartMonth: 4,
    currency: 'INR',
    taxRegistrationType: 'Regular',
  });
  console.log(`Created company: ${company.name}`);

  // --- Roles (seeded per-company from the default permission map) ---
  const roleDocs = await RoleModel.insertMany(
    Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, permissions]) => ({
      companyId: company._id,
      name,
      permissions,
      isSystemDefault: true,
    })),
  );
  const adminRole = roleDocs.find((r) => r.name === 'ADMIN')!;
  console.log(`Created ${roleDocs.length} roles`);

  // --- Admin user ---
  const passwordHash = await bcrypt.hash('ChangeMe@123', 10);
  const adminUser = await UserModel.create({
    email: 'admin@businesssuite.local',
    passwordHash,
    name: 'Admin User',
    isActive: true,
  });
  await CompanyMemberModel.create({
    companyId: company._id,
    userId: adminUser._id,
    roleId: adminRole._id,
    isActive: true,
  });
  console.log(
    'Created admin user: admin@businesssuite.local / ChangeMe@123 (DEV ONLY)',
  );

  console.log('\nSeed complete.');
  console.log(`Company: ${company.name} (${company.slug})`);
  console.log('Login: admin@businesssuite.local / ChangeMe@123 [DEV ONLY]');

  await mongoose.disconnect();
}

run().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
