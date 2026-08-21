/**
 * Development-only seed script. Creates a single demo company with one
 * ADMIN user so the app can be logged into on a fresh database.
 *
 * Usage: npm run seed
 */
import mongoose, { Types } from 'mongoose';
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
import {
  PermissionModule,
  PermissionModuleSchema,
} from '../../modules/permissions/schemas/module.schema';
import {
  SubModule,
  SubModuleSchema,
} from '../../modules/permissions/schemas/sub-module.schema';
import { Api, ApiSchema } from '../../modules/permissions/schemas/api.schema';
import {
  Permission,
  PermissionSchema,
} from '../../modules/permissions/schemas/permission.schema';
import {
  MODULE_SEED,
  API_SEED,
  ROLE_SEED,
} from './permission-catalog.seed-data';

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
  const PermissionModuleModel = mongoose.model(
    PermissionModule.name,
    PermissionModuleSchema,
  );
  const SubModuleModel = mongoose.model(SubModule.name, SubModuleSchema);
  const ApiModel = mongoose.model(Api.name, ApiSchema);
  const PermissionModel = mongoose.model(Permission.name, PermissionSchema);

  console.log('Clearing existing demo data...');
  await Promise.all([
    UserModel.deleteMany({}),
    RoleModel.deleteMany({}),
    CompanyModel.deleteMany({}),
    CompanyMemberModel.deleteMany({}),
    PermissionModuleModel.deleteMany({}),
    SubModuleModel.deleteMany({}),
    ApiModel.deleteMany({}),
    PermissionModel.deleteMany({}),
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

  // --- Permission catalog: modules -> submodules -> apis ---
  const moduleDocs = await PermissionModuleModel.insertMany(
    MODULE_SEED.map((m) => ({
      moduleName: m.moduleName,
      path: m.path,
      icon: m.icon,
      order: m.order,
    })),
  );
  const moduleIdByName = new Map(moduleDocs.map((m) => [m.moduleName, m._id]));

  const subModuleRows = MODULE_SEED.flatMap((m) =>
    m.subModules.map((s) => ({
      moduleId: moduleIdByName.get(m.moduleName),
      subModuleName: s.subModuleName,
      unique_key: s.unique_key,
    })),
  );
  const subModuleDocs = await SubModuleModel.insertMany(subModuleRows);
  const subModuleIdByKey = new Map(
    subModuleDocs.map((s) => [s.unique_key, s._id]),
  );
  console.log(
    `Created ${moduleDocs.length} permission modules, ${subModuleDocs.length} submodules`,
  );

  const apiRows = API_SEED.map((entry) => ({
    subModuleId: subModuleIdByKey.get(entry.unique_key),
    method: entry.method,
    endpointPaths: entry.endpointPaths,
    isActive: true,
  }));
  await ApiModel.insertMany(apiRows);
  console.log(`Created ${apiRows.length} api records`);

  // --- Roles (global, shared across all companies) ---
  const roleDocs = await RoleModel.insertMany(
    ROLE_SEED.map((r) => ({
      name: r.name,
      roleKey: r.roleKey,
      description: '',
      isSystemDefault: true,
    })),
  );
  const roleByName = new Map(roleDocs.map((r) => [r.name, r]));
  console.log(`Created ${roleDocs.length} global roles`);

  // --- Role permission grants ---
  await PermissionModel.insertMany(
    ROLE_SEED.map((r) => {
      const permissionId = r.permissions
        .map((key) => subModuleIdByKey.get(key))
        .filter((id): id is Types.ObjectId => Boolean(id));
      const moduleIdSet = new Set(
        subModuleDocs
          .filter((s) => r.permissions.includes(s.unique_key))
          .map((s) => String(s.moduleId)),
      );
      return {
        role_key: r.roleKey,
        moduleId: Array.from(moduleIdSet).map((id) => new Types.ObjectId(id)),
        permissionId,
        apiId: [],
      };
    }),
  );

  // Derive apiId from permissionId using the real Api records just inserted,
  // matching PermissionsService.createPermissions' distinct-lookup logic.
  const allApiDocs = await ApiModel.find().exec();
  for (const r of ROLE_SEED) {
    const permissionIds = r.permissions
      .map((key) => subModuleIdByKey.get(key))
      .filter((id): id is Types.ObjectId => Boolean(id))
      .map((id) => String(id));
    const apiIds = allApiDocs
      .filter((api) => permissionIds.includes(String(api.subModuleId)))
      .map((api) => api._id);
    await PermissionModel.updateOne(
      { role_key: r.roleKey },
      { $set: { apiId: apiIds } },
    ).exec();
  }
  console.log(`Created ${ROLE_SEED.length} role-permission grants`);

  // --- Demo users (one per key role, so the login page's quick-login buttons work) ---
  const DEMO_USERS = [
    { email: 'admin@businesssuite.local', name: 'Admin User', role: 'ADMIN' },
    {
      email: 'kavin@demotraders.example',
      name: 'Kavin Kumar',
      role: 'MANAGER',
    },
    { email: 'inventory@stbilling.local', name: 'Priya Sharma', role: 'SALES' },
    {
      email: 'sundar.accounts@demotraders.example',
      name: 'Sundar Raman',
      role: 'VIEWER',
    },
  ] as const;

  const passwordHash = await bcrypt.hash('ChangeMe@123', 10);
  for (const demo of DEMO_USERS) {
    const role = roleByName.get(demo.role);
    if (!role) throw new Error(`Seed error: role ${demo.role} not found`);
    const user = await UserModel.create({
      email: demo.email,
      passwordHash,
      name: demo.name,
      isActive: true,
    });
    await CompanyMemberModel.create({
      companyId: company._id,
      userId: user._id,
      roleId: role._id,
      isActive: true,
    });
    console.log(
      `Created ${demo.role} user: ${demo.email} / ChangeMe@123 (DEV ONLY)`,
    );
  }

  console.log('\nSeed complete.');
  console.log(`Company: ${company.name} (${company.slug})`);
  console.log('Login: admin@businesssuite.local / ChangeMe@123 [DEV ONLY]');

  await mongoose.disconnect();
}

run().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
