# Deployment Guide

## Prerequisites

### 1. Fix Locale Issue (RESOLVED)
The locale encoding error has been fixed with:
- UTF-8 locale configuration in Ansible
- System locale setup in common role
- Environment variables in group_vars

### 2. Server Setup Requirements

Before running Ansible, ensure your target server(s) have:

#### Initial Server Access
```bash
# Connect as root or user with sudo access
ssh root@103.61.224.161
# OR
ssh ubuntu@103.61.224.161
```

#### Using Existing 'hrms' User ✅
The Ansible configuration is set to use the existing 'hrms' user:
- User: `hrms`
- SSH Key: `/home/infotribo/off_laptop/work/cldb/cldb01/cldb01`
- All connectivity configured and working

#### SSH Key Setup (Already Configured) ✅
```bash
# SSH key is configured in Ansible group_vars:
ansible_ssh_private_key_file: /home/infotribo/off_laptop/work/cldb/cldb01/cldb01

# Test connectivity (should work):
./run-ansible.sh ping production
```

### 3. Update Inventory Configuration

Edit `ansible/inventories/production/hosts.yml` with your actual server IPs and access details.

### 4. Configure Vault Variables

```bash
# Create secure vault password
echo "your-secure-vault-password" > ansible/.vault_pass
chmod 600 ansible/.vault_pass

# Encrypt sensitive variables
cd ansible
ansible-vault encrypt inventories/production/group_vars/vault.yml
```

## Deployment Commands

### Test Connectivity
```bash
./run-ansible.sh ping production
```

### Initial Setup (First Time)
```bash
./run-ansible.sh setup production
```

### Deploy Updates
```bash
./run-ansible.sh deploy production
```

### Create Backup
```bash
./run-ansible.sh backup production
```

### Check Status
```bash
./run-ansible.sh status production
```

## Alternative: Connect as Different User

If you need to connect as a different user initially:

### Update Ansible Config
Edit `ansible/ansible.cfg`:
```ini
[defaults]
remote_user = ubuntu  # or root
```

### Or Override Per Command
```bash
cd ansible
ansible all -i inventories/production/hosts.yml -m ping -u ubuntu --ask-become-pass
```

## Troubleshooting

### SSH Connection Issues
1. Verify server IP and port
2. Check SSH key is added to server
3. Ensure deploy user exists with proper permissions
4. Test manual SSH connection: `ssh deploy@103.61.224.161`

### Ansible Errors
1. Check inventory file syntax
2. Verify vault password file exists
3. Ensure UTF-8 locale (already fixed)
4. Use verbose mode: `ansible-playbook -vvv`

### Service Issues
1. Check logs: `./run-ansible.sh logs production`
2. Verify service status: `./run-ansible.sh status production`
3. SSH to server and check manually:
   ```bash
   systemctl status recruit_platform-backend
   systemctl status recruit_platform-frontend
   systemctl status nginx
   ```

## Security Notes

1. Always use SSH keys, never passwords
2. Encrypt all sensitive variables with ansible-vault
3. Restrict SSH access to specific IPs if possible
4. Keep vault password secure and backed up
5. Use strong passwords for database and Redis
6. Enable UFW firewall (handled by playbook)

## Success Verification

After successful deployment:
1. Backend API: `https://your-domain.com/api/docs/`
2. Frontend: `https://your-domain.com`
3. Admin: `https://your-domain.com/admin/`

Test with the demo credentials from CLAUDE.md.