// Main IE Support Widget Implementation
window.ieSupport = {
    state: "initialized",
    isOpen: false,
    userData: null,
    activeThreads: null,

    getState() {
        return this.state;
    },

    async init() {
        const isPreview = window.location.href.includes('preview');
        const storedUser = localStorage.getItem('ie_team_user');
        
        if (isPreview || storedUser) {
            document.getElementById('ie-support-widget').style.display = 'block';
            if (storedUser) {
                this.userData = JSON.parse(storedUser);
            }
        }

        // Add event listeners
        document.getElementById('ie-support-toggle').addEventListener('click', () => this.showWidget());
        document.querySelector('.ie-chat-close').addEventListener('click', () => this.toggle());
        document.getElementById('ie-auth-submit').addEventListener('click', () => this.validateTeamMember());
    },

    async showWidget() {
        if (!this.userData) {
            // Show auth modal first
            document.querySelector('.ie-auth-modal').style.display = 'block';
        } else {
            // Already authenticated, show chat
            await this.loadThreads();
            this.toggle();
        }
    },

    async validateTeamMember() {
        const email = document.getElementById('ie-auth-email').value;
        const errorDiv = document.getElementById('ie-auth-error');
        
        if (!email.endsWith('@integral-ed.com')) {
            errorDiv.textContent = 'Please use your @integral-ed.com email address';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('https://hook.us1.make.com/r7d3v4vyohi00s68spr8y5mcsgk7jsbz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'team_validation',
                    email: email,
                    source: window.location.href
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.validated) {
                    this.userData = {
                        email: email,
                        userId: data.userId,
                        role: data.role,
                        projects: data.projects
                    };
                    localStorage.setItem('ie_team_user', JSON.stringify(this.userData));
                    
                    // Hide auth modal and show chat
                    document.querySelector('.ie-auth-modal').style.display = 'none';
                    await this.loadThreads();
                    this.toggle();
                } else {
                    errorDiv.textContent = 'Email not found in team directory';
                    errorDiv.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
            errorDiv.textContent = 'Error validating email. Please try again.';
            errorDiv.style.display = 'block';
        }
    },

    async loadThreads() {
        if (!this.userData || this.activeThreads) return;

        try {
            const response = await fetch('https://hook.us1.make.com/r7d3v4vyohi00s68spr8y5mcsgk7jsbz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'get_user_threads',
                    userId: this.userData.userId,
                    email: this.userData.email
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.activeThreads = data.threads || [];
                
                // Update thread selector
                const select = document.getElementById('ie-thread-select');
                select.innerHTML = '<option value="new">Start New Thread</option>';
                
                this.activeThreads.forEach(thread => {
                    const option = document.createElement('option');
                    option.value = thread.id;
                    option.textContent = `${thread.project || 'General'} - ${new Date(thread.lastActivity).toLocaleDateString()}`;
                    select.appendChild(option);
                });

                // Show thread selector if we have threads
                document.querySelector('.ie-thread-selector').style.display = 
                    this.activeThreads.length > 0 ? 'block' : 'none';
                
                // Add change listener
                select.addEventListener('change', (e) => this.selectThread(e.target.value));
            }
        } catch (error) {
            console.error('Error loading threads:', error);
        }
    },

    selectThread(threadId) {
        const frame = document.querySelector('.ie-chat-frame');
        const context = {
            source: window.location.href,
            type: 'user_testing_feedback',
            feature: window.location.pathname,
            preview: window.location.href.includes('preview'),
            user: this.userData
        };

        if (threadId !== 'new') {
            context.thread_id = threadId;
        }

        frame.src = '/support?agent=business-analyst&context=' + 
            encodeURIComponent(JSON.stringify(context));
    },

    toggle() {
        const modal = document.querySelector('.ie-chat-modal');
        const frame = modal.querySelector('iframe');
        
        if (!this.isOpen) {
            if (!frame.src || frame.src === 'about:blank') {
                this.selectThread('new');
            }
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
        
        this.isOpen = !this.isOpen;
    }
};

// Process any queued commands
if (window.ieSupport.q) {
    window.ieSupport.q.forEach(args => window.ieSupport[args[0]](...args.slice(1)));
    delete window.ieSupport.q;
}

// Initialize
window.ieSupport.init(); 