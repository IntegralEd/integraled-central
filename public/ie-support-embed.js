(function() {
    // Initialize proxy function for queuing commands before script loads
    if (!window.ieSupport || window.ieSupport("getState") !== "initialized") {
        window.ieSupport = function(...arguments) {
            if (!window.ieSupport.q) {
                window.ieSupport.q = [];
            }
            window.ieSupport.q.push(arguments);
        };
        window.ieSupport = new Proxy(window.ieSupport, {
            get(target, prop) {
                if (prop === "q") return target.q;
                return (...args) => target(prop, ...args);
            }
        });
    }

    const WIDGET_HTML = `
        <div id="ie-support-widget" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 10000;">
            <button id="ie-support-toggle" style="
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 20px;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            ">
                <span style="font-size: 20px;">💡</span>
                Share Feedback
            </button>
        </div>
    `;

    const AUTH_MODAL_HTML = `
        <div class="ie-auth-modal" style="display: none;">
            <div class="ie-auth-content">
                <h3>IntegralEd Team Validation</h3>
                <p>Please enter your @integral-ed.com email to continue</p>
                <input type="email" id="ie-auth-email" placeholder="name@integral-ed.com">
                <button id="ie-auth-submit">Continue</button>
                <div id="ie-auth-error" style="color: red; display: none;"></div>
            </div>
        </div>
    `;

    const STYLES = `
        .ie-chat-modal, .ie-auth-modal {
            display: none;
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 400px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10001;
            overflow: hidden;
        }
        .ie-chat-modal {
            height: 600px;
            flex-direction: column;
        }
        .ie-auth-modal {
            padding: 20px;
        }
        .ie-auth-content {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .ie-auth-content input {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .ie-auth-content button {
            background: #007AFF;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 4px;
            cursor: pointer;
        }
        .ie-chat-header {
            padding: 15px;
            background: #f5f5f7;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ie-chat-frame {
            flex: 1;
            border: none;
            width: 100%;
            height: 100%;
        }
        .ie-thread-selector {
            padding: 15px;
            border-bottom: 1px solid #ddd;
            display: none;
        }
        .ie-thread-selector select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 10px;
        }
    `;

    function loadMainScript() {
        const script = document.createElement('script');
        script.src = '/ie-support-main.js';
        script.id = 'ie-support-script';
        document.body.appendChild(script);
    }

    // Add styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = STYLES;
    document.head.appendChild(styleSheet);

    // Add HTML elements
    const container = document.createElement('div');
    container.innerHTML = WIDGET_HTML + AUTH_MODAL_HTML;
    document.body.appendChild(container);

    // Create chat modal
    const chatModal = document.createElement('div');
    chatModal.className = 'ie-chat-modal';
    chatModal.innerHTML = `
        <div class="ie-chat-header">
            <div>Business Analyst Chat</div>
            <button class="ie-chat-close" style="background:none;border:none;cursor:pointer;font-size:20px;">&times;</button>
        </div>
        <div class="ie-thread-selector">
            <select id="ie-thread-select">
                <option value="new">Start New Thread</option>
            </select>
        </div>
        <iframe class="ie-chat-frame" src="about:blank"></iframe>
    `;
    document.body.appendChild(chatModal);

    // Handle script loading
    if (document.readyState === 'complete') {
        loadMainScript();
    } else {
        window.addEventListener('load', loadMainScript);
    }
})(); 