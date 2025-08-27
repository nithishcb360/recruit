#!/bin/bash

# SSH Key Setup Script for Recruitment Platform Deployment

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================="
echo "SSH Key Setup for Ansible Deployment"
echo "=================================="
echo ""

# Check if SSH key already exists
if [[ -f "$HOME/.ssh/id_rsa" ]]; then
    echo -e "${YELLOW}SSH key already exists at $HOME/.ssh/id_rsa${NC}"
    echo "Do you want to:"
    echo "1) Use existing key"
    echo "2) Generate new key (will backup existing)"
    echo "3) Exit"
    read -p "Choose option (1-3): " choice
    
    case $choice in
        1)
            echo -e "${GREEN}Using existing SSH key${NC}"
            ;;
        2)
            echo -e "${YELLOW}Backing up existing key...${NC}"
            cp "$HOME/.ssh/id_rsa" "$HOME/.ssh/id_rsa.backup.$(date +%Y%m%d_%H%M%S)"
            cp "$HOME/.ssh/id_rsa.pub" "$HOME/.ssh/id_rsa.pub.backup.$(date +%Y%m%d_%H%M%S)"
            
            echo -e "${GREEN}Generating new SSH key...${NC}"
            ssh-keygen -t rsa -b 4096 -C "deploy@recruitment-platform" -f "$HOME/.ssh/id_rsa"
            ;;
        3)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
else
    echo -e "${GREEN}Generating SSH key for deployment...${NC}"
    ssh-keygen -t rsa -b 4096 -C "deploy@recruitment-platform" -f "$HOME/.ssh/id_rsa"
fi

echo ""
echo -e "${GREEN}SSH Key Setup Complete!${NC}"
echo ""
echo "Public key location: $HOME/.ssh/id_rsa.pub"
echo "Private key location: $HOME/.ssh/id_rsa"
echo ""

# Display public key
echo -e "${YELLOW}Your public key:${NC}"
echo "----------------------------------------"
cat "$HOME/.ssh/id_rsa.pub"
echo "----------------------------------------"
echo ""

# Provide next steps
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Copy the public key above to your server's authorized_keys:"
echo "   For manual setup:"
echo "   ssh-copy-id ubuntu@103.61.224.161"
echo ""
echo "2. Or use the bootstrap command:"
echo "   ./run-ansible.sh bootstrap production ubuntu"
echo ""
echo "3. Test SSH connection:"
echo "   ssh ubuntu@103.61.224.161"
echo ""
echo "4. After bootstrap, test deploy user:"
echo "   ssh deploy@103.61.224.161"
echo ""

# SSH config suggestion
if [[ ! -f "$HOME/.ssh/config" ]] || ! grep -q "recruitment-prod" "$HOME/.ssh/config"; then
    echo -e "${YELLOW}Optional: Add to ~/.ssh/config for easier access:${NC}"
    echo ""
    echo "Host recruitment-prod"
    echo "    HostName 103.61.224.161"
    echo "    User deploy"
    echo "    IdentityFile ~/.ssh/id_rsa"
    echo "    StrictHostKeyChecking no"
    echo ""
    
    read -p "Add this to your SSH config? (y/n): " add_config
    if [[ $add_config == "y" || $add_config == "Y" ]]; then
        echo "" >> "$HOME/.ssh/config"
        echo "Host recruitment-prod" >> "$HOME/.ssh/config"
        echo "    HostName 103.61.224.161" >> "$HOME/.ssh/config"
        echo "    User deploy" >> "$HOME/.ssh/config"
        echo "    IdentityFile ~/.ssh/id_rsa" >> "$HOME/.ssh/config"
        echo "    StrictHostKeyChecking no" >> "$HOME/.ssh/config"
        echo -e "${GREEN}SSH config updated!${NC}"
        echo "You can now connect with: ssh recruitment-prod"
    fi
fi

echo ""
echo -e "${GREEN}Setup complete! You can now run:${NC}"
echo "./run-ansible.sh bootstrap production ubuntu"