# 🚨 DEVELOPMENT RULES - MANDATORY COMPLIANCE

## **CRITICAL: DEV vs LIVE ENVIRONMENT RULES**

### **1. ENVIRONMENT IDENTIFICATION - MANDATORY**

**🔴 DEV FOLDER (Development Environment):**
- **Location**: `C:\Users\PC-PAXIIT\Desktop\paxiit_website` (Local PC)
- **Purpose**: All development work happens here
- **Server**: `http://localhost:8000` (local development server)
- **Status**: Safe to modify, test, break, and fix
- **Terminal**: **Git Bash ONLY** - Never use PowerShell or CMD

**🔴 LIVE/PRODUCTION FOLDER (Production Environment):**
- **Location**: `/volume1/web/paxiit.com` (NAS: 192.168.1.3:2222)
- **Purpose**: Live website serving real users
- **URL**: `http://paxiit.com` (public website)
- **Status**: **NEVER MODIFY DIRECTLY** - Only update via validated deployment

---

### **2. MANDATORY WORKFLOW RULES**

#### **🔴 RULE #1: ALWAYS WORK IN DEV FOLDER**
- **ALL development work** must be done in the dev folder
- **ALL code changes** must be made in dev folder first
- **ALL testing** must be done in dev folder first
- **NEVER** make changes directly to live/production folder

#### **🔴 RULE #2: NEVER AUTO-UPDATE LIVE**
- **NEVER** automatically deploy to live/production
- **NEVER** run deployment scripts without explicit user approval
- **NEVER** modify production files directly
- **NEVER** assume deployment is needed - always ask user first

#### **🔴 RULE #3: VALIDATION BEFORE DEPLOYMENT**
- **MUST** validate all changes in dev folder first
- **MUST** test thoroughly in dev environment
- **MUST** get user approval before any deployment
- **MUST** wait for explicit "GO" or "DEPLOY" command from user

---

### **3. DEPLOYMENT PROCESS - STRICT PROCEDURE**

#### **Step 1: Development (DEV Folder)**
1. Make changes in dev folder
2. Test changes locally (`http://localhost:8000`)
3. Verify all functionality works
4. Fix any issues in dev folder
5. **DO NOT** proceed to deployment yet

#### **Step 2: Validation (DEV Folder)**
1. Run full test suite in dev
2. Verify no errors in console
3. Test all affected features
4. Confirm user acceptance in dev
5. **WAIT** for user validation approval

#### **Step 3: User Approval (REQUIRED)**
1. **MUST** wait for user to say:
   - "Deploy to production"
   - "Go live"
   - "Deploy now"
   - Or similar explicit approval
2. **NEVER** assume deployment is wanted
3. **NEVER** deploy without explicit approval

#### **Step 4: Deployment (Only After Approval)**
1. User has explicitly approved deployment
2. Run `deploy.sh` script (or manual deployment)
3. Verify deployment success
4. Test production after deployment

---

### **4. WHAT TO DO - CORRECT BEHAVIOR**

✅ **ALWAYS:**
- Work in dev folder (`C:\Users\PC-PAXIIT\Desktop\paxiit_website`)
- Test changes locally first
- Ask user before deploying
- Wait for explicit approval
- Validate in dev before suggesting deployment

✅ **WHEN USER ASKS TO DEPLOY:**
- Confirm what will be deployed
- Show what changed in dev
- Run deployment script
- Verify deployment success

---

### **5. WHAT NOT TO DO - FORBIDDEN ACTIONS**

❌ **NEVER:**
- Modify files in production directly
- Auto-deploy without user approval
- Assume deployment is needed
- Skip validation in dev
- Deploy untested code
- Make changes to live website automatically

❌ **NEVER ASSUME:**
- "User probably wants this deployed"
- "This looks ready for production"
- "I should deploy this automatically"
- "User will approve, so I'll deploy now"

---

### **6. ENVIRONMENT VERIFICATION**

**Before making ANY changes:**
1. Check current working directory: `pwd` (should show `/c/Users/PC-PAXIIT/Desktop/paxiit_website`)
2. Verify you're in dev folder: `C:\Users\PC-PAXIIT\Desktop\paxiit_website`
3. Confirm server is running locally: `http://localhost:8000`
4. **NEVER** work in production path: `/volume1/web/paxiit.com`
5. **ALWAYS** use Git Bash terminal - Never use PowerShell or CMD
6. **VERIFY Git Bash**: Run `bash --version` - should show "GNU bash" (not PowerShell/CMD)
7. **USE Git Bash commands**: Use `&&`, `||`, `grep`, `find`, etc. (not Windows CMD commands)

**Before ANY deployment:**
1. Confirm all changes are in dev folder
2. Verify dev environment is working
3. Get explicit user approval
4. Only then proceed with deployment

---

### **7. DEPLOYMENT SCRIPT USAGE**

**Deployment Script**: `deploy.sh`
- **Location**: Dev folder root
- **Purpose**: Deploys from dev to production
- **Usage**: Only run when user explicitly approves

**Before Running deploy.sh:**
1. ✅ All changes tested in dev
2. ✅ User has validated dev changes
3. ✅ User has given explicit approval
4. ✅ Ready to deploy to production

**NEVER run deploy.sh:**
- Without user approval
- For untested changes
- Automatically
- Without validation

---

### **8. COMMUNICATION RULES**

**When making changes:**
- "I'm making changes in the dev folder"
- "Testing locally at http://localhost:8000"
- "Changes are ready for testing in dev"

**When ready for deployment:**
- "Dev changes are validated and ready"
- "Would you like me to deploy to production?"
- "Waiting for your approval to deploy"

**NEVER say:**
- "I'll deploy this automatically"
- "This is ready, deploying now"
- "I'll update production"

---

### **9. EMERGENCY PROCEDURES**

**If production has issues:**
1. **DO NOT** modify production directly
2. Fix issue in dev folder first
3. Test fix in dev
4. Get user approval
5. Deploy fix to production

**If dev and production differ:**
1. Identify differences
2. Fix in dev folder
3. Test in dev
4. Get approval
5. Deploy to sync

---

### **10. COMPLIANCE STATEMENT**

**I understand and will comply with these rules:**
- ✅ I will ONLY work in dev folder
- ✅ I will NEVER auto-update live/production
- ✅ I will ALWAYS validate in dev first
- ✅ I will ALWAYS get user approval before deployment
- ✅ I will NEVER modify production files directly

---

## **📋 QUICK REFERENCE**

| Action | Dev Folder | Live/Production |
|--------|-----------|-----------------|
| **Make Changes** | ✅ YES | ❌ NEVER |
| **Test Changes** | ✅ YES | ❌ NEVER (test in dev) |
| **Deploy Changes** | N/A | ✅ ONLY after approval |
| **Modify Files** | ✅ YES | ❌ NEVER directly |
| **Run Server** | ✅ YES (localhost:8000) | ❌ NEVER (via deploy.sh) |

---

## **🛠️ STANDARDIZED TOOLS SYSTEM**

### **Single Source of Truth - No Duplicates**

**🔴 MANDATORY: Use ONLY These Standardized Tools**

#### **1. Server Management**
- **`start.sh`** - **ONLY** server startup script
  - Cross-platform (Linux/Mac/Windows Git Bash)
  - **NEVER** use `start.bat` or other startup methods
  - Usage: `./start.sh` or `bash start.sh`

#### **2. Production Deployment**
- **`deploy.sh`** - **ONLY** deployment method
  - Handles: backup, file transfer, server restart, verification
  - **NEVER** use manual deployment or other scripts
  - Usage: `./deploy.sh` (requires user approval first)

#### **3. API Key Setup**
- **`setup-api-keys.sh`** - Interactive API key configuration
  - For initial AI service setup
  - Usage: `./setup-api-keys.sh`

#### **4. Documentation Structure**
- **`README.md`** - Main project documentation
- **`DEVELOPMENT_RULES.md`** - This file (mandatory rules)
- **Essential docs only** - No duplicate or outdated documentation

**❌ FORBIDDEN:**
- Creating duplicate scripts (test-deploy.sh, deploy-v2.sh, etc.)
- Creating test files in root directory
- Keeping temporary log files (*.log, *.txt in root)
- Multiple deployment methods
- Outdated documentation files

**✅ STANDARDIZED WORKFLOW:**
1. Development: Use `start.sh` to run dev server
2. Testing: Test in dev environment (`localhost:8000`)
3. Deployment: Use `deploy.sh` (after approval)
4. Documentation: Update `README.md` or relevant docs only

---

## **🎯 SUMMARY**

**GOLDEN RULE:**
> **"DEV FIRST, VALIDATE, APPROVE, THEN DEPLOY"**
> 
> 1. Work in dev folder
> 2. Validate in dev
> 3. Get user approval
> 4. Deploy to production

**TOOL RULE:**
> **"ONE TOOL, ONE PURPOSE, NO DUPLICATES"**
> 
> 1. Use standardized tools only
> 2. No duplicate scripts
> 3. No test files in production
> 4. Clean git repository

**NEVER:**
- Auto-deploy
- Modify production directly
- Skip validation
- Deploy without approval
- Create duplicate tools
- Keep temporary test files

---

**Last Updated**: Current Session  
**Status**: Active - Must Follow  
**Compliance**: Mandatory

