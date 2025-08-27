#!/bin/bash

# Ansible Deployment Helper Script
# Fixes locale issues and provides convenient commands

# Set UTF-8 locale for Ansible
export LC_ALL=en_US.utf8
export LANG=en_US.utf8
export LANGUAGE=en_US.utf8

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_usage() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  bootstrap   Bootstrap servers (create deploy user, setup SSH)"
    echo "  setup       Initial server setup and full deployment"
    echo "  deploy      Deploy application updates"
    echo "  backup      Create backup of application and database"
    echo "  rollback    Rollback to previous version"
    echo "  ping        Test connectivity to servers"
    echo "  status      Check service status on servers"
    echo ""
    echo "Environments:"
    echo "  production  Deploy to production servers"
    echo "  staging     Deploy to staging servers"
    echo ""
    echo "Examples:"
    echo "  $0 bootstrap production ubuntu  # Bootstrap as ubuntu user"
    echo "  $0 setup production"
    echo "  $0 deploy staging"
    echo "  $0 backup production"
}

run_ansible() {
    local playbook=$1
    local inventory=$2
    local extra_args=$3
    
    echo -e "${GREEN}Running Ansible playbook: $playbook${NC}"
    echo -e "${YELLOW}Environment: $inventory${NC}"
    echo ""
    
    cd ansible || { echo -e "${RED}Error: ansible directory not found${NC}"; exit 1; }
    
    ansible-playbook \
        -i "inventories/$inventory/hosts.yml" \
        "playbooks/$playbook.yml" \
        $extra_args
}

check_requirements() {
    # Check if Ansible is installed
    if ! command -v ansible &> /dev/null; then
        echo -e "${RED}Error: Ansible is not installed${NC}"
        echo "Install with: sudo apt install ansible"
        exit 1
    fi
    
    # Check Ansible version
    ansible_version=$(ansible --version | head -n1 | cut -d' ' -f2)
    echo -e "${GREEN}Ansible version: $ansible_version${NC}"
    
    # Check if inventory exists
    local env=${2:-production}
    if [[ ! -f "ansible/inventories/$env/hosts.yml" ]]; then
        echo -e "${RED}Error: Inventory file not found for environment: $env${NC}"
        exit 1
    fi
}

# Main script logic
case "$1" in
    bootstrap)
        check_requirements "$@"
        local initial_user="${3:-ubuntu}"
        echo -e "${GREEN}Bootstrapping ${2:-production} servers as user: $initial_user${NC}"
        echo -e "${YELLOW}This will setup hrms user and SSH key authentication${NC}"
        
        # Check if SSH key exists
        if [[ ! -f "/home/infotribo/off_laptop/work/cldb/cldb01/cldb01" ]]; then
            echo -e "${RED}Error: SSH private key not found at /home/infotribo/off_laptop/work/cldb/cldb01/cldb01${NC}"
            echo "Please ensure the SSH key file exists and is accessible"
            exit 1
        fi
        
        echo -e "${GREEN}Using SSH key: /home/infotribo/off_laptop/work/cldb/cldb01/cldb01${NC}"
        cd ansible
        ansible-playbook \
            -i "inventories/${2:-production}/hosts.yml" \
            "playbooks/bootstrap.yml" \
            -u "$initial_user" \
            -e "initial_user=$initial_user" \
            --ask-become-pass
        ;;
    setup)
        check_requirements "$@"
        run_ansible "site-simple" "${2:-production}"
        ;;
    deploy)
        check_requirements "$@"
        run_ansible "deploy" "${2:-production}"
        ;;
    backup)
        check_requirements "$@"
        run_ansible "backup" "${2:-production}"
        ;;
    rollback)
        check_requirements "$@"
        run_ansible "rollback" "${2:-production}"
        ;;
    ping)
        check_requirements "$@"
        echo -e "${GREEN}Testing connectivity to ${2:-production} servers as hrms user...${NC}"
        cd ansible
        ansible all -i "inventories/${2:-production}/hosts.yml" -m ping
        ;;
    status)
        check_requirements "$@"
        echo -e "${GREEN}Checking service status on ${2:-production} servers...${NC}"
        cd ansible
        ansible webservers -i "inventories/${2:-production}/hosts.yml" -m shell -a "systemctl status recruit_platform-backend recruit_platform-frontend nginx"
        ;;
    logs)
        check_requirements "$@"
        echo -e "${GREEN}Fetching recent logs from ${2:-production} servers...${NC}"
        cd ansible
        ansible webservers -i "inventories/${2:-production}/hosts.yml" -m shell -a "tail -50 /var/log/recruit_platform/gunicorn-error.log"
        ;;
    test)
        check_requirements "$@"
        echo -e "${GREEN}Running connectivity and configuration tests...${NC}"
        cd ansible
        # Test connectivity
        ansible all -i "inventories/${2:-production}/hosts.yml" -m ping
        # Test sudo access
        ansible all -i "inventories/${2:-production}/hosts.yml" -m shell -a "whoami" --become
        # Check Python version
        ansible all -i "inventories/${2:-production}/hosts.yml" -m shell -a "python3 --version"
        ;;
    *)
        print_usage
        exit 1
        ;;
esac