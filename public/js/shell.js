/**
 * GST Simulation Portal - UI Shell & Component Architecture
 * Section 1: UI Shell & Design System
 * 
 * Provides:
 * - Top Accessibility Bar (Screen reader, font resize, contrast mode)
 * - Authentic Header (Emblem of India, GST title, portal search, helpdesk, user profile/login)
 * - Mega-Menu Navigation (Home, Services, GST Law, Downloads, Search Taxpayer, Help)
 * - Breadcrumbs Trail
 * - Standard GST Footer with Expand/Collapse & Back-to-top
 * - Global Toast Notification System
 * - Simulated OTP Modal & Global Dialogs
 * - Taxpayer Persona & Session Switcher
 */

(function (window, document) {
  'use strict';

  // Demo Taxpayer Profiles for Simulation
  var DEMO_USERS = {
    guest: null,
    regular: {
      id: 'regular',
      tradeName: 'BHARAT ENTERPRISES',
      legalName: 'BHARAT ENTERPRISES PRIVATE LIMITED',
      gstin: '27AAACB2234K1ZV',
      stateCode: '27',
      stateName: 'Maharashtra',
      taxpayerType: 'Regular',
      filingFrequency: 'Monthly',
      aggregateTurnover: '₹ 4,52,00,000',
      authorizedSignatory: 'Rajesh Kumar Sharma',
      email: 'contact@bharatenterprises.in',
      mobile: '9820123456',
      activeLedgerCash: 106000.00,
      activeLedgerCredit: 230000.00,
      status: 'Active'
    },
    composition: {
      id: 'composition',
      tradeName: 'GUPTA STORES',
      legalName: 'GUPTA KIRANA & GENERAL STORES',
      gstin: '07AABCG1234F1ZQ',
      stateCode: '07',
      stateName: 'Delhi',
      taxpayerType: 'Composition',
      filingFrequency: 'Quarterly (CMP-08)',
      aggregateTurnover: '₹ 48,20,000',
      authorizedSignatory: 'Ramesh Gupta',
      email: 'guptastores.delhi@gmail.com',
      mobile: '9811223344',
      activeLedgerCash: 12000.00,
      activeLedgerCredit: 0.00,
      status: 'Active'
    },
    sez: {
      id: 'sez',
      tradeName: 'SOUTHERN TECH',
      legalName: 'SOUTHERN TECH SOLUTIONS LLP',
      gstin: '29AABCS5544N1ZR',
      stateCode: '29',
      stateName: 'Karnataka',
      taxpayerType: 'Regular',
      filingFrequency: 'Monthly',
      aggregateTurnover: '₹ 15,30,00,000',
      authorizedSignatory: 'Karthik Raman',
      email: 'compliance@southerntech.com',
      mobile: '9845012345',
      activeLedgerCash: 154000.00,
      activeLedgerCredit: 310000.00,
      status: 'Active'
    }
  };

  // Determine base asset URL relative to public root
  function detectAssetsPrefix() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      var idx = src.indexOf('/js/shell.js');
      if (idx !== -1) {
        return src.substring(0, idx + 1); // e.g. "http://localhost:8000/" or relative
      }
    }
    // Fallback relative to typical public structure
    return '';
  }

  var assetsPrefix = detectAssetsPrefix();

  // Root namespace
  var GSTSimulation = {
    version: '1.0.0',
    assetsPrefix: assetsPrefix,
    currentUser: null,
    activeMenu: null,

    // ------------------------------------------------------------------------
    // User & Session Management
    // ------------------------------------------------------------------------
    getUser: function () {
      if (this.currentUser) return this.currentUser;
      try {
        var stored = localStorage.getItem('gst_sim_user') || localStorage.getItem('gst_current_taxpayer');
        if (stored) {
          this.currentUser = JSON.parse(stored);
          return this.currentUser;
        }
      } catch (e) {
        console.warn('Could not read user from storage', e);
      }
      return null;
    },

    setUser: function (userOrKey) {
      if (typeof userOrKey === 'string' && DEMO_USERS[userOrKey]) {
        this.currentUser = DEMO_USERS[userOrKey];
      } else if (userOrKey === null || userOrKey === 'guest') {
        this.currentUser = null;
      } else {
        this.currentUser = userOrKey;
      }

      try {
        if (this.currentUser) {
          localStorage.setItem('gst_sim_user', JSON.stringify(this.currentUser));
          localStorage.setItem('gst_current_taxpayer', JSON.stringify(this.currentUser));
        } else {
          localStorage.removeItem('gst_sim_user');
          localStorage.removeItem('gst_current_taxpayer');
        }
      } catch (e) {}

      // Re-render user profile actions in header
      this.refreshHeaderUserArea();
      this.showToast(
        this.currentUser ? 'Active session: ' + (this.currentUser.tradeName || this.currentUser.legalName) + ' (' + this.currentUser.gstin + ')' : 'Logged out. Current session: Guest / Pre-login',
        'info',
        'Session Updated'
      );
      
      // Dispatch custom event for listeners
      var evt = new CustomEvent('gstUserChanged', { detail: { user: this.currentUser } });
      window.dispatchEvent(evt);
    },

    loginAs: function (userOrKey) {
      return this.setUser(userOrKey);
    },

    logout: function () {
      this.setUser(null);
    },

    // ------------------------------------------------------------------------
    // Accessibility Preferences
    // ------------------------------------------------------------------------
    setFontSize: function (size) {
      document.body.classList.remove('font-sm', 'font-md', 'font-lg');
      if (size === 'sm') document.body.classList.add('font-sm');
      else if (size === 'lg') document.body.classList.add('font-lg');
      else document.body.classList.add('font-md');

      try {
        localStorage.setItem('gst_sim_font_size', size);
      } catch (e) {}

      var btns = document.querySelectorAll('.gst-fsize-btn');
      btns.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-size') === size);
      });
    },

    toggleHighContrast: function () {
      var isContrast = document.body.classList.toggle('high-contrast');
      try {
        localStorage.setItem('gst_sim_contrast', isContrast ? 'high' : 'normal');
      } catch (e) {}
      this.showToast(isContrast ? 'High Contrast Mode Enabled' : 'Standard View Restored', 'info');
    },

    showScreenReaderInfo: function () {
      this.showModal({
        title: '<i class="fa fa-universal-access"></i> Screen Reader Access Information',
        content: '<p>The GST Simulation Portal complies with World Wide Web Consortium (W3C) Web Content Accessibility Guidelines (WCAG) 2.0 level AA.</p>' +
                 '<p>Users of screen readers can navigate this site using standard keystrokes:</p>' +
                 '<ul>' +
                 '<li><strong>Tab / Shift+Tab:</strong> Navigate across interactive links, forms, and buttons</li>' +
                 '<li><strong>Enter / Space:</strong> Activate buttons, drop-down menus, and dialogs</li>' +
                 '<li><strong>Esc:</strong> Dismiss open dialogs, OTP prompts, and mega-menus</li>' +
                 '<li><strong>Skip to Main Content:</strong> Focus the first link on page load to bypass repetitive navigation</li>' +
                 '</ul>',
        buttons: [{ text: 'Close', primary: true }]
      });
    },

    // ------------------------------------------------------------------------
    // Toast Notification System
    // ------------------------------------------------------------------------
    showToast: function (message, type, title, duration) {
      type = type || 'info';
      duration = duration || 4000;

      var container = document.getElementById('gst-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'gst-toast-container';
        container.className = 'gst-toast-container';
        document.body.appendChild(container);
      }

      var icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        danger: 'fa-times-circle'
      };

      var titles = {
        info: 'GST Notification',
        success: 'Operation Successful',
        warning: 'Important Notice',
        danger: 'Action Required / Error'
      };

      var toast = document.createElement('div');
      toast.className = 'gst-toast toast-' + type;
      toast.setAttribute('role', 'alert');

      var iconClass = icons[type] || 'fa-info-circle';
      var displayTitle = title || titles[type] || 'GST Portal Alert';

      toast.innerHTML = 
        '<i class="fa ' + iconClass + ' gst-toast-icon"></i>' +
        '<div class="gst-toast-content">' +
          '<div class="gst-toast-title">' + displayTitle + '</div>' +
          '<p class="gst-toast-msg">' + message + '</p>' +
        '</div>' +
        '<button class="gst-toast-close" title="Dismiss">&times;</button>';

      var closeBtn = toast.querySelector('.gst-toast-close');
      var dismissed = false;

      function dismissToast() {
        if (dismissed) return;
        dismissed = true;
        toast.classList.add('hide-toast');
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 250);
      }

      closeBtn.addEventListener('click', dismissToast);

      if (duration > 0) {
        setTimeout(dismissToast, duration);
      }

      container.appendChild(toast);
    },

    // ------------------------------------------------------------------------
    // Modal System
    // ------------------------------------------------------------------------
    showModal: function (options) {
      options = options || {};
      var title = options.title || 'GST Portal Notice';
      var content = options.content || '';
      var buttons = options.buttons || [{ text: 'Close', primary: true }];
      var onClose = options.onClose || null;

      // Close existing modal if open
      this.closeModal();

      var backdrop = document.createElement('div');
      backdrop.id = 'gst-active-modal';
      backdrop.className = 'gst-modal-backdrop';

      var windowEl = document.createElement('div');
      windowEl.className = 'gst-modal-window';
      if (options.maxWidth) {
        windowEl.style.maxWidth = options.maxWidth;
      }

      // Header
      var headerHtml = 
        '<div class="gst-modal-header">' +
          '<h4>' + title + '</h4>' +
          '<button class="close-btn" title="Close dialog">&times;</button>' +
        '</div>';

      // Body
      var bodyHtml = '<div class="gst-modal-body">' + content + '</div>';

      // Footer
      var footerHtml = '<div class="gst-modal-footer"></div>';

      windowEl.innerHTML = headerHtml + bodyHtml + footerHtml;
      backdrop.appendChild(windowEl);
      document.body.appendChild(backdrop);

      var footerEl = windowEl.querySelector('.gst-modal-footer');
      var closeBtn = windowEl.querySelector('.close-btn');

      var self = this;
      function closeHandler() {
        self.closeModal();
        if (typeof onClose === 'function') onClose();
      }

      closeBtn.addEventListener('click', closeHandler);

      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeHandler();
      });

      // Escape key
      var escHandler = function (e) {
        if (e.key === 'Escape') {
          closeHandler();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Render buttons
      buttons.forEach(function (btnConfig) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = btnConfig.primary ? 'gst-btn-primary' : 'gst-btn-secondary';
        btn.textContent = btnConfig.text;
        btn.addEventListener('click', function () {
          if (typeof btnConfig.onClick === 'function') {
            var result = btnConfig.onClick();
            if (result !== false) closeHandler();
          } else {
            closeHandler();
          }
        });
        footerEl.appendChild(btn);
      });

      return backdrop;
    },

    closeModal: function () {
      var active = document.getElementById('gst-active-modal');
      if (active && active.parentNode) {
        active.parentNode.removeChild(active);
      }
    },

    showConfirm: function (options) {
      options = options || {};
      this.showModal({
        title: '<i class="fa fa-question-circle" style="color:var(--gst-gold);"></i> ' + (options.title || 'Confirm Action'),
        content: '<p>' + (options.message || 'Are you sure you want to proceed?') + '</p>',
        buttons: [
          {
            text: options.cancelText || 'Cancel',
            primary: false,
            onClick: options.onCancel
          },
          {
            text: options.confirmText || 'Confirm',
            primary: true,
            onClick: options.onConfirm
          }
        ]
      });
    },

    // ------------------------------------------------------------------------
    // Simulated OTP Verification Modal
    // ------------------------------------------------------------------------
    showOtpModal: function (options) {
      options = options || {};
      var mobile = options.mobile || '98******10';
      var email = options.email || 'ta******@example.com';
      var expectedOtp = options.expectedOtp || '123456';
      var title = options.title || 'Verify with OTP (Simulated)';
      var onVerify = options.onVerify || null;
      var onResend = options.onResend || null;

      var bodyHtml = 
        '<div style="text-align:center;">' +
          '<div style="font-size:36px;color:var(--gst-navy);margin-bottom:10px;"><i class="fa fa-shield"></i></div>' +
          '<p style="font-size:14px;color:#333;margin:0 0 5px 0;"><strong>One Time Password (OTP) Verification</strong></p>' +
          '<p style="font-size:12px;color:#666;margin:0 0 15px 0;">Please enter the 6-digit OTP sent to your registered contact:</p>' +
          '<p style="font-size:12px;color:var(--gst-navy);margin:0 0 10px 0;">' +
            '<i class="fa fa-mobile" style="font-size:16px;"></i> Mobile: <strong>' + mobile + '</strong> &nbsp;|&nbsp; ' +
            '<i class="fa fa-envelope-o"></i> Email: <strong>' + email + '</strong>' +
          '</p>' +
          '<div class="gst-otp-box-group" id="gst-otp-inputs">' +
            '<input type="text" maxlength="1" class="gst-otp-digit" data-idx="0" autofocus>' +
            '<input type="text" maxlength="1" class="gst-otp-digit" data-idx="1">' +
            '<input type="text" maxlength="1" class="gst-otp-digit" data-idx="2">' +
            '<input type="text" maxlength="1" class="gst-otp-digit" data-idx="3">' +
            '<input type="text" maxlength="1" class="gst-otp-digit" data-idx="4">' +
            '<input type="text" maxlength="1" class="gst-otp-digit" data-idx="5">' +
          '</div>' +
          '<div class="gst-otp-helper-badge">' +
            '<span><i class="fa fa-info-circle"></i> Simulation Testing OTP:</span>' +
            '<code>' + expectedOtp + '</code>' +
          '</div>' +
          '<div class="gst-otp-timer" id="gst-otp-countdown">' +
            'Resend OTP available in <span id="gst-timer-sec">60</span> seconds' +
          '</div>' +
        '</div>';

      var self = this;
      var timerInterval = null;

      var modal = this.showModal({
        title: '<i class="fa fa-key"></i> ' + title,
        content: bodyHtml,
        buttons: [
          {
            text: 'Cancel',
            primary: false,
            onClick: function () {
              if (timerInterval) clearInterval(timerInterval);
              return true;
            }
          },
          {
            text: 'Verify & Proceed',
            primary: true,
            onClick: function () {
              var inputs = document.querySelectorAll('#gst-otp-inputs .gst-otp-digit');
              var entered = '';
              inputs.forEach(function (inp) { entered += inp.value; });

              if (entered.length < 6) {
                self.showToast('Please enter the complete 6-digit OTP', 'warning', 'OTP Required');
                return false;
              }

              if (entered === expectedOtp || entered === '123456') {
                if (timerInterval) clearInterval(timerInterval);
                self.showToast('OTP verified successfully!', 'success', 'Verification Complete');
                if (typeof onVerify === 'function') {
                  setTimeout(function () { onVerify(entered); }, 150);
                }
                return true;
              } else {
                self.showToast('Invalid OTP entered. Please try again with ' + expectedOtp, 'danger', 'Verification Failed');
                inputs.forEach(function (inp) {
                  inp.style.borderColor = '#c0392b';
                  inp.value = '';
                });
                if (inputs[0]) inputs[0].focus();
                return false;
              }
            }
          }
        ],
        onClose: function () {
          if (timerInterval) clearInterval(timerInterval);
        }
      });

      // Auto-focus and auto-advance digit boxes
      var digits = modal.querySelectorAll('.gst-otp-digit');
      digits.forEach(function (inp, idx) {
        inp.addEventListener('input', function (e) {
          var val = inp.value.replace(/[^0-9]/g, '');
          inp.value = val;
          if (val && idx < 5) {
            digits[idx + 1].focus();
          }
        });

        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Backspace' && !inp.value && idx > 0) {
            digits[idx - 1].focus();
          }
        });

        // Allow paste of 6 digits
        inp.addEventListener('paste', function (e) {
          e.preventDefault();
          var pasteData = (e.clipboardData || window.clipboardData).getData('text');
          var clean = pasteData.replace(/[^0-9]/g, '').substring(0, 6);
          for (var i = 0; i < clean.length && i < 6; i++) {
            digits[i].value = clean[i];
          }
          if (clean.length === 6) {
            digits[5].focus();
          } else if (digits[clean.length]) {
            digits[clean.length].focus();
          }
        });
      });

      if (digits[0]) setTimeout(function () { digits[0].focus(); }, 100);

      // Countdown
      var secLeft = 60;
      var timerSpan = modal.querySelector('#gst-timer-sec');
      var timerDiv = modal.querySelector('#gst-otp-countdown');

      timerInterval = setInterval(function () {
        secLeft--;
        if (timerSpan) timerSpan.textContent = secLeft;
        if (secLeft <= 0) {
          clearInterval(timerInterval);
          if (timerDiv) {
            timerDiv.innerHTML = '<a href="javascript:void(0)" id="gst-resend-link" style="color:var(--gst-blue);font-weight:bold;text-decoration:none;"><i class="fa fa-repeat"></i> Resend OTP</a>';
            var resendLink = timerDiv.querySelector('#gst-resend-link');
            if (resendLink) {
              resendLink.addEventListener('click', function () {
                self.showToast('New OTP simulated and dispatched to registered mobile and email.', 'info', 'OTP Resent');
                if (typeof onResend === 'function') onResend();
                self.showOtpModal(options);
              });
            }
          }
        }
      }, 1000);
    },

    // ------------------------------------------------------------------------
    // Render Complete Shell Components
    // ------------------------------------------------------------------------
    renderTopBar: function () {
      var dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      return (
        '<a href="#main-content" class="gst-skip-link">Skip to Main Content</a>' +
        '<div class="gst-top-bar">' +
          '<div class="container">' +
            '<div class="gst-top-bar-left">' +
              '<span class="gst-sim-badge"><span class="live-dot"></span> Official GST Simulator</span>' +
              '<span style="font-size:11px;color:#94a3b8;"><i class="fa fa-calendar-o"></i> ' + dateStr + '</span>' +
            '</div>' +
            '<ul class="gst-top-bar-right">' +
              '<li><a href="javascript:void(0)" id="gst-skip-content-btn"><i class="fa fa-share"></i> Skip to Content</a></li>' +
              '<li><a href="javascript:void(0)" id="gst-screen-reader-btn"><i class="fa fa-universal-access"></i> Screen Reader</a></li>' +
              '<li class="gst-accessibility-controls">' +
                '<button type="button" class="gst-contrast-btn" id="gst-contrast-btn" title="Toggle High Contrast View">' +
                  '<i class="fa fa-adjust"></i> Contrast' +
                '</button>' +
                '<button type="button" class="gst-fsize-btn" data-size="sm" title="Smaller font">A-</button>' +
                '<button type="button" class="gst-fsize-btn active" data-size="md" title="Default font">A</button>' +
                '<button type="button" class="gst-fsize-btn" data-size="lg" title="Larger font">A+</button>' +
              '</li>' +
            '</ul>' +
          '</div>' +
        '</div>'
      );
    },

    renderHeader: function () {
      var emblemPath = this.resolveAsset('images/Emblem_of_India-white.svg');

      return (
        '<header class="gst-main-header">' +
          '<div class="container">' +
            '<div class="gst-header-flex">' +
              '<a href="index.html" class="gst-branding-block" title="Goods and Services Tax Simulation Portal">' +
                '<img src="' + emblemPath + '" alt="Government of India Emblem" class="gst-emblem-img">' +
                '<div class="gst-title-group">' +
                  '<h1 class="gst-site-title">Goods and Services Tax</h1>' +
                  '<span class="gst-site-subtitle">Government of India, States and Union Territories</span>' +
                '</div>' +
              '</a>' +
              '<div class="gst-header-actions">' +
                '<div class="gst-search-box">' +
                  '<input type="text" id="gst-header-search" placeholder="Search Portal / Helpdesk..." aria-label="Search Portal">' +
                  '<button type="button" id="gst-search-btn" title="Search"><i class="fa fa-search"></i></button>' +
                '</div>' +
                '<div class="gst-helpdesk-pill">' +
                  '<i class="fa fa-phone"></i>' +
                  '<span>Helpdesk: <strong>1800-103-4786</strong></span>' +
                '</div>' +
                '<div id="gst-auth-container">' +
                  this.getAuthAreaHtml() +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</header>'
      );
    },

    getAuthAreaHtml: function () {
      var user = this.getUser();
      if (!user) {
        return (
          '<div class="gst-auth-buttons">' +
            '<a href="registration.html" class="gst-btn-register" id="gst-btn-reg-action"><i class="fa fa-user-plus"></i> Register</a>' +
            '<a href="login.html" class="gst-btn-login" id="gst-btn-login-action"><i class="fa fa-lock"></i> Login</a>' +
          '</div>'
        );
      } else {
        return (
          '<div class="gst-user-profile-menu">' +
            '<button type="button" class="gst-user-profile-btn" id="gst-user-menu-btn">' +
              '<i class="fa fa-user-circle" style="font-size:24px;color:var(--gst-teal);"></i>' +
              '<div class="gst-user-profile-info">' +
                '<span class="gst-user-trade-name">' + (user.tradeName || user.legalName) + '</span>' +
                '<span class="gst-user-gstin">' + user.gstin + '</span>' +
              '</div>' +
              '<i class="fa fa-caret-down" style="font-size:12px;margin-left:4px;"></i>' +
            '</button>' +
            '<div class="gst-user-dropdown-pane" id="gst-user-dropdown">' +
              '<div class="gst-user-dropdown-header">' +
                '<h5>' + (user.tradeName || user.legalName) + '</h5>' +
                '<p>GSTIN: <strong>' + user.gstin + '</strong></p>' +
                '<p>Type: <span class="badge" style="background:var(--gst-navy);color:#fff;font-size:10px;">' + (user.taxpayerType || user.type || 'Regular') + '</span></p>' +
              '</div>' +
              '<ul>' +
                '<li><a href="returns.html" id="gst-dd-dashboard"><i class="fa fa-tachometer"></i> Returns Dashboard</a></li>' +
                '<li><a href="ledgers.html#cash" id="gst-dd-cash"><i class="fa fa-money"></i> Electronic Cash Ledger</a></li>' +
                '<li><a href="ledgers.html#credit" id="gst-dd-credit"><i class="fa fa-credit-card"></i> Electronic Credit Ledger</a></li>' +
                '<li><a href="notices.html" id="gst-dd-notices"><i class="fa fa-bell-o"></i> View Notices & Orders</a></li>' +
                '<li><a href="profile.html" id="gst-dd-profile"><i class="fa fa-user"></i> My Taxpayer Profile</a></li>' +
                '<li class="divider"></li>' +
                '<li><a href="javascript:void(0)" id="gst-dd-logout" style="color:#c0392b;"><i class="fa fa-sign-out" style="color:#c0392b;"></i> Logout</a></li>' +
              '</ul>' +
            '</div>' +
          '</div>'
        );
      }
    },

    refreshHeaderUserArea: function () {
      var container = document.getElementById('gst-auth-container');
      if (container) {
        container.innerHTML = this.getAuthAreaHtml();
        this.bindUserAreaEvents();
      }
    },

    renderNavBar: function () {
      return (
        '<nav class="gst-nav-bar" aria-label="Main Portal Navigation">' +
          '<div class="container gst-nav-container">' +
            '<button type="button" class="gst-mobile-toggle" id="gst-nav-toggle" aria-label="Toggle Navigation">' +
              '<i class="fa fa-bars"></i> Menu' +
            '</button>' +
            '<ul class="gst-nav-list" id="gst-nav-list">' +
              // 1. Home
              '<li class="gst-nav-item active">' +
                '<a href="index.html" class="gst-nav-link"><i class="fa fa-home"></i> Home</a>' +
              '</li>' +

              // 2. Services Mega-Menu (6 Authentic Sections)
              '<li class="gst-nav-item" data-menu="services">' +
                '<a href="javascript:void(0)" class="gst-nav-link">' +
                  'Services <i class="fa fa-caret-down caret-icon"></i>' +
                '</a>' +
                '<div class="gst-mega-menu gst-mega-menu-wide">' +
                  '<div class="gst-mega-columns">' +
                    // Column 1: Registration
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-id-card-o"></i> Registration</h6>' +
                      '<ul>' +
                        '<li><a href="registration.html" data-nav="new-registration">New Registration</a></li>' +
                        '<li><a href="track-status.html" data-nav="track-registration">Track Application Status</a></li>' +
                        '<li><a href="registration.html?tab=clarification" data-nav="clarification">Filing Clarification</a></li>' +
                        '<li><a href="registration.html?tab=revocation" data-nav="revocation">Revocation of Cancellation</a></li>' +
                      '</ul>' +
                    '</div>' +
                    // Column 2: Returns
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-file-text-o"></i> Returns</h6>' +
                      '<ul>' +
                        '<li><a href="returns.html" data-nav="returns-dashboard">Returns Dashboard</a></li>' +
                        '<li><a href="gstr1.html" data-nav="gstr1">Form GSTR-1 (Outward)</a></li>' +
                        '<li><a href="gstr2b.html" data-nav="gstr2b">Form GSTR-2B (Auto ITC)</a></li>' +
                        '<li><a href="gstr3b.html" data-nav="gstr3b">Form GSTR-3B (Summary)</a></li>' +
                        '<li><a href="gstr9.html" data-nav="gstr9">Form GSTR-9 (Annual)</a></li>' +
                        '<li><a href="track-status.html?type=return" data-nav="track-return">Track Return Status</a></li>' +
                      '</ul>' +
                    '</div>' +
                    // Column 3: Ledgers
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-book"></i> Ledgers</h6>' +
                      '<ul>' +
                        '<li><a href="ledgers.html#cash" data-nav="cash-ledger">Electronic Cash Ledger</a></li>' +
                        '<li><a href="ledgers.html#credit" data-nav="credit-ledger">Electronic Credit Ledger</a></li>' +
                        '<li><a href="ledgers.html#liability" data-nav="liability-register">Liability Register</a></li>' +
                      '</ul>' +
                    '</div>' +
                    // Column 4: Payments
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-credit-card"></i> Payments</h6>' +
                      '<ul>' +
                        '<li><a href="challan.html" data-nav="create-challan">Create Challan (PMT-06)</a></li>' +
                        '<li><a href="challan.html#track" data-nav="track-payment">Track Payment Status</a></li>' +
                        '<li><a href="help.html#grievance" data-nav="pmt-07">Payment Grievance (PMT-07)</a></li>' +
                      '</ul>' +
                    '</div>' +
                    // Column 5: User Services
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-cogs"></i> User Services</h6>' +
                      '<ul>' +
                        '<li><a href="gst-law.html#hsn" data-nav="search-hsn">Search HSN / SAC Code</a></li>' +
                        '<li><a href="notices.html" data-nav="notices">View Notices & Orders</a></li>' +
                        '<li><a href="profile.html" data-nav="profile">My Taxpayer Profile</a></li>' +
                        '<li><a href="help.html#grievance" data-nav="grievance">Grievances / Complaints</a></li>' +
                        '<li><a href="help.html#holidays" data-nav="holiday-list">Holiday List</a></li>' +
                      '</ul>' +
                    '</div>' +
                    // Column 6: Refunds & e-Way Bill
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-refresh"></i> Refunds & e-Way</h6>' +
                      '<ul>' +
                        '<li><a href="dashboard.html#refunds" data-nav="rfd-01">Refund Form (RFD-01)</a></li>' +
                        '<li><a href="track-status.html?type=refund" data-nav="track-refund">Track Application Status</a></li>' +
                        '<li><a href="ewaybill.html" data-nav="ewaybill">e-Way Bill System</a></li>' +
                      '</ul>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</li>' +

              // 3. GST Law
              '<li class="gst-nav-item" data-menu="gstlaw">' +
                '<a href="gst-law.html" class="gst-nav-link">' +
                  'GST Law <i class="fa fa-caret-down caret-icon"></i>' +
                '</a>' +
                '<div class="gst-mega-menu gst-mega-menu-medium">' +
                  '<div class="gst-mega-columns">' +
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-balance-scale"></i> Acts & Rules</h6>' +
                      '<ul>' +
                        '<li><a href="gst-law.html#cgst" data-nav="cgst-act">Central GST (CGST) Act, 2017</a></li>' +
                        '<li><a href="gst-law.html#igst" data-nav="igst-act">Integrated GST (IGST) Act, 2017</a></li>' +
                        '<li><a href="gst-law.html#utgst" data-nav="utgst-act">Union Territory GST (UTGST) Act</a></li>' +
                        '<li><a href="gst-law.html#sgst" data-nav="sgst-acts">State GST (SGST) Acts</a></li>' +
                        '<li><a href="gst-law.html#rules" data-nav="gst-rules">GST Rules, 2017 (Updated)</a></li>' +
                      '</ul>' +
                    '</div>' +
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-file-text-o"></i> Notifications & Circulars</h6>' +
                      '<ul>' +
                        '<li><a href="gst-law.html#notifications" data-nav="central-tax-notif">Central Tax Notifications</a></li>' +
                        '<li><a href="gst-law.html#notifications" data-nav="integrated-tax-notif">Integrated Tax Notifications</a></li>' +
                        '<li><a href="gst-law.html#circulars" data-nav="circulars">CBIC Circulars & Orders</a></li>' +
                        '<li><a href="gst-law.html#hsn" data-nav="search-hsn">HSN & Tax Rate Matrix</a></li>' +
                      '</ul>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</li>' +

              // 4. Downloads
              '<li class="gst-nav-item" data-menu="downloads">' +
                '<a href="downloads.html" class="gst-nav-link">' +
                  'Downloads <i class="fa fa-caret-down caret-icon"></i>' +
                '</a>' +
                '<div class="gst-mega-menu gst-mega-menu-medium">' +
                  '<div class="gst-mega-columns">' +
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-download"></i> Offline Tools</h6>' +
                      '<ul>' +
                        '<li><a href="downloads.html#returns" data-nav="returns-offline">Returns Offline Tool (GSTR-1, 2B, 3B)</a></li>' +
                        '<li><a href="downloads.html#returns" data-nav="gstr3b-offline">GSTR-3B Offline Utility</a></li>' +
                        '<li><a href="downloads.html#matching" data-nav="matching-tool">Offline Matching Tool</a></li>' +
                        '<li><a href="downloads.html#returns" data-nav="itc01-tool">GST ITC-01 Offline Tool</a></li>' +
                      '</ul>' +
                    '</div>' +
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-bar-chart"></i> Data & Templates</h6>' +
                      '<ul>' +
                        '<li><a href="downloads.html#statistics" data-nav="gst-statistics">GST Statistics & Collections</a></li>' +
                        '<li><a href="downloads.html#templates" data-nav="excel-templates">Return Templates & JSON Schemas</a></li>' +
                      '</ul>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</li>' +

              // 5. Search Taxpayer
              '<li class="gst-nav-item" data-menu="searchtp">' +
                '<a href="search-taxpayer.html" class="gst-nav-link">' +
                  'Search Taxpayer <i class="fa fa-caret-down caret-icon"></i>' +
                '</a>' +
                '<div class="gst-mega-menu">' +
                  '<div class="gst-menu-column">' +
                    '<h6><i class="fa fa-search"></i> Search Facilities</h6>' +
                    '<ul>' +
                      '<li><a href="search-taxpayer.html" data-nav="search-gstin">Search by GSTIN / UIN</a></li>' +
                      '<li><a href="search-taxpayer.html?by=pan" data-nav="search-pan">Search by PAN</a></li>' +
                      '<li><a href="search-taxpayer.html?by=composition" data-nav="search-composition">Search Composition Taxpayer</a></li>' +
                    '</ul>' +
                  '</div>' +
                '</div>' +
              '</li>' +

              // 6. Help and Taxpayer Facilities
              '<li class="gst-nav-item" data-menu="help">' +
                '<a href="help.html" class="gst-nav-link">' +
                  'Help and Taxpayer Facilities <i class="fa fa-caret-down caret-icon"></i>' +
                '</a>' +
                '<div class="gst-mega-menu gst-mega-menu-medium">' +
                  '<div class="gst-mega-columns">' +
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-question-circle"></i> Guides & Self-Help</h6>' +
                      '<ul>' +
                        '<li><a href="help.html#manuals" data-nav="user-manuals">User Manuals & FAQs</a></li>' +
                        '<li><a href="help.html#system" data-nav="system-requirements">System Requirements</a></li>' +
                        '<li><a href="help.html#videos" data-nav="video-tutorials">Video Tutorials</a></li>' +
                        '<li><a href="help.html#advisories" data-nav="advisories">Advisories & New Features</a></li>' +
                      '</ul>' +
                    '</div>' +
                    '<div class="gst-menu-column">' +
                      '<h6><i class="fa fa-headphones"></i> Helpdesk & Redressal</h6>' +
                      '<ul>' +
                        '<li><a href="help.html#grievance" data-nav="grievance-portal">Grievance Redressal Portal for GST</a></li>' +
                        '<li><a href="help.html#helpdesk" data-nav="tollfree">Toll-Free Helpline Info</a></li>' +
                        '<li><a href="help.html#helpdesk" data-nav="media-releases">CBIC Helpdesk & Directory</a></li>' +
                      '</ul>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</li>' +

              // 7. e-Way Bill
              '<li class="gst-nav-item">' +
                '<a href="ewaybill.html" data-nav="ewaybill" class="gst-nav-link"><i class="fa fa-truck"></i> e-Way Bill System</a>' +
              '</li>' +
            '</ul>' +

            // Persona simulation switcher
            '<div class="gst-demo-profile-switcher">' +
              '<select id="gst-persona-selector" title="Switch Simulated Taxpayer Role" aria-label="Simulated Taxpayer Role">' +
                '<option value="guest">Role: Guest / Pre-login</option>' +
                '<option value="regular" selected>Role: Regular Taxpayer (Bharat Enterprises)</option>' +
                '<option value="composition">Role: Composition Taxpayer (Gupta Stores)</option>' +
                '<option value="sez">Role: SEZ Unit (Southern Tech)</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
        '</nav>'
      );
    },

    renderBreadcrumbs: function (trail) {
      trail = trail || [
        { name: 'Home', url: 'index.html' },
        { name: 'Simulation Workspace' }
      ];

      var itemsHtml = '';
      trail.forEach(function (item, idx) {
        var isLast = idx === trail.length - 1;
        if (isLast || !item.url) {
          itemsHtml += '<li>' + item.name + '</li>';
        } else {
          itemsHtml += '<li><a href="' + item.url + '">' + item.name + '</a></li>';
        }
      });

      return (
        '<div class="gst-breadcrumb-container">' +
          '<div class="container">' +
            '<ul class="gst-breadcrumb-list">' +
              '<li><a href="index.html"><i class="fa fa-home"></i></a></li>' +
              itemsHtml +
            '</ul>' +
          '</div>' +
        '</div>'
      );
    },

    renderFooter: function () {
      var dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      return (
        '<footer class="gst-footer" id="gst-portal-footer">' +
          '<div class="gst-footer-expander" id="gst-footer-toggle" title="Expand / Collapse Footer">' +
            '<i class="fa fa-angle-down" id="gst-footer-toggle-icon"></i>' +
          '</div>' +
          '<div class="gst-footer-main">' +
            '<div class="container">' +
              '<div class="row">' +
                // Col 1: About GST
                '<div class="col-md-3 col-sm-6 col-xs-12">' +
                  '<div class="gst-fhead">About GST</div>' +
                  '<ul>' +
                    '<li><a href="javascript:void(0)" data-nav="gst-council">GST Council Structure</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="gst-history">GST History & Milestones</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="vision-mission">Vision & Mission</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="gst-structure">Goods and Services Tax Network</a></li>' +
                  '</ul>' +
                '</div>' +

                // Col 2: Related Sites
                '<div class="col-md-3 col-sm-6 col-xs-12">' +
                  '<div class="gst-fhead">Related Sites</div>' +
                  '<ul>' +
                    '<li><a href="javascript:void(0)" data-nav="cbic">Central Board of Indirect Taxes and Customs</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="state-taxes">State Tax Websites</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="national-portal">National Portal of India</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="eway-bill-site">e-Way Bill System</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="e-invoice">e-Invoice Portal</a></li>' +
                  '</ul>' +
                '</div>' +

                // Col 3: Help and Support
                '<div class="col-md-3 col-sm-6 col-xs-12">' +
                  '<div class="gst-fhead">Help and Support</div>' +
                  '<ul>' +
                    '<li><a href="javascript:void(0)" data-nav="grievance">Grievance Redressal Portal for GST</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="faqs">Frequently Asked Questions</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="system-req">System Requirements</a></li>' +
                    '<li><a href="javascript:void(0)" data-nav="feedback">Portal Feedback</a></li>' +
                    '<li><a href="database.html"><i class="fa fa-database"></i> SQLite Database Explorer</a></li>' +
                  '</ul>' +
                '</div>' +

                // Col 4: Contact Us & Toll-Free
                '<div class="col-md-3 col-sm-6 col-xs-12">' +
                  '<div class="gst-fhead toll-free"><i class="fa fa-phone"></i> 1800-103-4786</div>' +
                  '<p class="gst-footer-contact-text">' +
                    '<strong>Goods and Services Tax Network</strong><br>' +
                    'East Wing, Worldmark 1, Aerocity,<br>' +
                    'New Delhi - 110037, India<br>' +
                    'Helpline Hours: 9:00 AM to 9:00 PM (Mon-Sat)' +
                  '</p>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Secondary Bar
          '<div class="gst-footer-secondary">' +
            '<div class="container">' +
              '<ul class="gst-footer-secondary-links">' +
                '<li><a href="javascript:void(0)" data-nav="hyperlink-policy">Hyperlinking Policy</a></li>' +
                '<li>|</li>' +
                '<li><a href="javascript:void(0)" data-nav="privacy-policy">Privacy Policy</a></li>' +
                '<li>|</li>' +
                '<li><a href="javascript:void(0)" data-nav="terms-conditions">Terms and Conditions</a></li>' +
                '<li>|</li>' +
                '<li><a href="javascript:void(0)" data-nav="disclaimer">Copyright &amp; Disclaimer</a></li>' +
              '</ul>' +
            '</div>' +
          '</div>' +

          // Tertiary Bottom Bar
          '<div class="gst-footer-bottom">' +
            '<div class="container gst-footer-bottom-flex">' +
              '<div>' +
                '&copy; 2026 Goods and Services Tax Network. Simulated for Training &amp; Operational Mastery.' +
              '</div>' +
              '<div>' +
                'Site Last Updated on: <strong>' + dateStr + '</strong> | Designed &amp; Developed by GSTN' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</footer>' +

        // Floating Back to top
        '<div class="gst-back-to-top" id="gst-back-to-top" title="Scroll to Top">' +
          '<i class="fa fa-angle-up"></i>' +
          '<p>Top</p>' +
        '</div>'
      );
    },

    // Helper to resolve asset paths
    resolveAsset: function (relPath) {
      if (relPath.indexOf('http') === 0 || relPath.indexOf('//') === 0 || relPath.indexOf('data:') === 0) {
        return relPath;
      }
      return this.assetsPrefix + relPath.replace(/^\//, '');
    },

    // ------------------------------------------------------------------------
    // Event Binding & Interactivity
    // ------------------------------------------------------------------------
    bindEvents: function () {
      var self = this;

      // Skip to main content link
      var skipBtn = document.getElementById('gst-skip-content-btn');
      if (skipBtn) {
        skipBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var main = document.getElementById('main-content') || document.querySelector('.content-wrapper') || document.querySelector('main');
          if (main) {
            main.setAttribute('tabindex', '-1');
            main.focus();
            main.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }

      // Screen Reader modal
      var srBtn = document.getElementById('gst-screen-reader-btn');
      if (srBtn) {
        srBtn.addEventListener('click', function (e) {
          e.preventDefault();
          self.showScreenReaderInfo();
        });
      }

      // High contrast toggle
      var contrastBtn = document.getElementById('gst-contrast-btn');
      if (contrastBtn) {
        contrastBtn.addEventListener('click', function () {
          self.toggleHighContrast();
        });
      }

      // Font size buttons
      var fsizeBtns = document.querySelectorAll('.gst-fsize-btn');
      fsizeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var size = btn.getAttribute('data-size');
          self.setFontSize(size);
        });
      });

      // Search box trigger
      var searchInput = document.getElementById('gst-header-search');
      var searchBtn = document.getElementById('gst-search-btn');
      function performSearch() {
        var query = searchInput ? searchInput.value.trim() : '';
        if (!query) {
          self.showToast('Please type a search keyword (e.g. GSTR-1, ITC, Challan, HSN)', 'warning', 'Search GST Portal');
          return;
        }
        self.showToast('Searching GST Knowledge Base for: "' + query + '"', 'info', 'Search Query');
      }
      if (searchBtn) searchBtn.addEventListener('click', performSearch);
      if (searchInput) {
        searchInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') performSearch();
        });
      }

      // Persona selector
      var personaSel = document.getElementById('gst-persona-selector');
      if (personaSel) {
        var user = self.getUser();
        if (user && user.id) {
          personaSel.value = user.id;
        } else {
          personaSel.value = 'guest';
        }

        personaSel.addEventListener('change', function () {
          var val = personaSel.value;
          self.setUser(val);
        });
      }

      // Mega-menu interactivity
      var navItems = document.querySelectorAll('.gst-nav-item[data-menu]');
      navItems.forEach(function (item) {
        var link = item.querySelector('.gst-nav-link');
        var mega = item.querySelector('.gst-mega-menu');

        // Toggle on click
        link.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          var wasOpen = item.classList.contains('open');

          // Close all open menus first
          navItems.forEach(function (other) {
            other.classList.remove('open');
            var otherMenu = other.querySelector('.gst-mega-menu');
            if (otherMenu) otherMenu.classList.remove('show');
          });

          if (!wasOpen) {
            item.classList.add('open');
            if (mega) mega.classList.add('show');
          }
        });
      });

      // Close mega-menu when clicking outside
      document.addEventListener('click', function (e) {
        if (!e.target.closest('.gst-nav-item[data-menu]')) {
          navItems.forEach(function (item) {
            item.classList.remove('open');
            var m = item.querySelector('.gst-mega-menu');
            if (m) m.classList.remove('show');
          });
        }
      });

      // Mobile nav toggle
      var navToggle = document.getElementById('gst-nav-toggle');
      var navList = document.getElementById('gst-nav-list');
      if (navToggle && navList) {
        navToggle.addEventListener('click', function () {
          navList.classList.toggle('show');
        });
      }

      // Footer collapse/expand toggle
      var footerToggle = document.getElementById('gst-footer-toggle');
      var footer = document.getElementById('gst-portal-footer');
      var toggleIcon = document.getElementById('gst-footer-toggle-icon');
      if (footerToggle && footer) {
        footerToggle.addEventListener('click', function () {
          var isCollapsed = footer.classList.toggle('collapsed');
          if (toggleIcon) {
            toggleIcon.className = isCollapsed ? 'fa fa-angle-up' : 'fa fa-angle-down';
          }
        });
      }

      // Back to top floating button
      var backToTop = document.getElementById('gst-back-to-top');
      if (backToTop) {
        window.addEventListener('scroll', function () {
          if (window.pageYOffset > 300) {
            backToTop.classList.add('show');
          } else {
            backToTop.classList.remove('show');
          }
        });

        backToTop.addEventListener('click', function () {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // Mega-menu and footer nav click handlers (dispatch custom event or handle navigation)
      document.querySelectorAll('[data-nav]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var navKey = el.getAttribute('data-nav');
          var text = el.textContent.trim();
          self.handleNavigation(navKey, text);
        });
      });

      // Bind user area
      this.bindUserAreaEvents();

      // Restore saved contrast / font size
      try {
        var savedContrast = localStorage.getItem('gst_sim_contrast');
        if (savedContrast === 'high') {
          document.body.classList.add('high-contrast');
        }
        var savedSize = localStorage.getItem('gst_sim_font_size');
        if (savedSize) {
          this.setFontSize(savedSize);
        }
      } catch (e) {}
    },

    bindUserAreaEvents: function () {
      var self = this;

      var loginBtn = document.getElementById('gst-btn-login-action');
      if (loginBtn) {
        loginBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'login.html';
        });
      }

      var regBtn = document.getElementById('gst-btn-reg-action');
      if (regBtn) {
        regBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'registration.html';
        });
      }

      var userMenuBtn = document.getElementById('gst-user-menu-btn');
      var userDropdown = document.getElementById('gst-user-dropdown');
      if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function (e) {
          if (!e.target.closest('.gst-user-profile-menu')) {
            userDropdown.classList.remove('show');
          }
        });
      }

      var logoutBtn = document.getElementById('gst-dd-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
          e.preventDefault();
          self.logout();
          var personaSel = document.getElementById('gst-persona-selector');
          if (personaSel) personaSel.value = 'guest';
          window.location.href = 'index.html';
        });
      }

      var profileBtn = document.getElementById('gst-dd-profile');
      if (profileBtn) {
        profileBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'profile.html';
        });
      }

      var dashboardBtn = document.getElementById('gst-dd-dashboard');
      if (dashboardBtn) {
        dashboardBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'returns.html';
        });
      }

      var cashBtn = document.getElementById('gst-dd-cash');
      if (cashBtn) {
        cashBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'ledgers.html#cash';
        });
      }

      var creditBtn = document.getElementById('gst-dd-credit');
      if (creditBtn) {
        creditBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'ledgers.html#credit';
        });
      }

      var noticesBtn = document.getElementById('gst-dd-notices');
      if (noticesBtn) {
        noticesBtn.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = 'notices.html';
        });
      }
    },

    showLoginDialog: function () {
      var self = this;
      var content = 
        '<form id="gst-modal-login-form">' +
          '<div style="margin-bottom:12px;">' +
            '<label style="font-size:12px;font-weight:600;color:var(--gst-navy);">Username <span style="color:red;">*</span></label>' +
            '<input type="text" id="gst-modal-user" class="form-control" placeholder="Enter simulated username" value="bharat_trading" required>' +
          '</div>' +
          '<div style="margin-bottom:12px;">' +
            '<label style="font-size:12px;font-weight:600;color:var(--gst-navy);">Password <span style="color:red;">*</span></label>' +
            '<input type="password" id="gst-modal-pass" class="form-control" placeholder="Enter password" value="Bharat@2026" required>' +
          '</div>' +
          '<div style="margin-bottom:12px;">' +
            '<label style="font-size:12px;font-weight:600;color:var(--gst-navy);">Role / Entity to Authenticate As</label>' +
            '<select id="gst-modal-role" class="form-control">' +
              '<option value="regular">Regular Taxpayer (Bharat Enterprises)</option>' +
              '<option value="composition">Composition Taxpayer (Gupta Stores)</option>' +
              '<option value="sez">SEZ Unit (Southern Tech)</option>' +
            '</select>' +
          '</div>' +
          '<p style="font-size:11px;color:#666;margin:0;">Simulated GST portal login authenticates instantly without external network calls.</p>' +
        '</form>';

      this.showModal({
        title: '<i class="fa fa-lock"></i> Taxpayer Login (Simulation)',
        content: content,
        buttons: [
          { text: 'Cancel', primary: false },
          {
            text: 'Login',
            primary: true,
            onClick: function () {
              var roleSel = document.getElementById('gst-modal-role');
              var role = roleSel ? roleSel.value : 'regular';
              self.setUser(role);
              var personaSel = document.getElementById('gst-persona-selector');
              if (personaSel) personaSel.value = role;
              return true;
            }
          }
        ]
      });
    },

    showTaxpayerProfileModal: function () {
      var user = this.getUser();
      if (!user) {
        this.showToast('Please log in first to view your taxpayer profile.', 'warning');
        return;
      }

      var content = 
        '<div style="display:flex;gap:15px;align-items:center;margin-bottom:15px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">' +
          '<div style="width:50px;height:50px;border-radius:50%;background:var(--gst-ice-blue);border:2px solid var(--gst-teal);display:flex;align-items:center;justify-content:center;color:var(--gst-navy);font-size:24px;">' +
            '<i class="fa fa-building-o"></i>' +
          '</div>' +
          '<div>' +
            '<h4 style="margin:0;color:var(--gst-navy);font-size:16px;">' + (user.tradeName || user.legalName) + '</h4>' +
            '<p style="margin:2px 0 0 0;font-size:12px;color:#666;">' + user.legalName + '</p>' +
          '</div>' +
        '</div>' +
        '<table class="table table-bordered table-striped" style="font-size:12.5px;margin:0;">' +
          '<tr><th style="width:40%;">GSTIN</th><td><strong style="color:var(--gst-navy);font-family:monospace;">' + user.gstin + '</strong></td></tr>' +
          '<tr><th>Taxpayer Type</th><td><span class="badge" style="background:var(--gst-navy);color:#fff;">' + (user.taxpayerType || user.type || 'Regular') + '</span></td></tr>' +
          '<tr><th>State & Jurisdiction</th><td>' + user.stateName + ' (State Code: ' + user.stateCode + ')</td></tr>' +
          '<tr><th>Filing Frequency</th><td>' + user.filingFrequency + '</td></tr>' +
          '<tr><th>Aggregate Turnover</th><td>' + user.aggregateTurnover + '</td></tr>' +
          '<tr><th>Authorized Signatory</th><td>' + user.authorizedSignatory + '</td></tr>' +
          '<tr><th>Electronic Cash Ledger</th><td><strong>₹ ' + (user.activeLedgerCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</strong></td></tr>' +
          '<tr><th>Electronic Credit Ledger</th><td><strong>₹ ' + (user.activeLedgerCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</strong></td></tr>' +
          '<tr><th>Registration Status</th><td><span class="label label-success" style="background:#27ae60;color:#fff;padding:2px 6px;border-radius:3px;">' + user.status + '</span></td></tr>' +
        '</table>';

      this.showModal({
        title: '<i class="fa fa-id-badge"></i> Taxpayer Master Profile',
        content: content,
        maxWidth: '560px',
        buttons: [{ text: 'Close', primary: true }]
      });
    },

    handleNavigation: function (navKey, label) {
      var routes = {
        'home': 'index.html',
        'new-registration': 'registration.html',
        'track-registration': 'track-status.html',
        'clarification': 'registration.html?tab=clarification',
        'revocation': 'registration.html?tab=revocation',

        'returns': 'returns.html',
        'returns-dashboard': 'returns.html',
        'gstr1': 'gstr1.html',
        'gstr2b': 'gstr2b.html',
        'gstr3b': 'gstr3b.html',
        'gstr9': 'gstr9.html',
        'track-return': 'track-status.html?type=return',

        'cash-ledger': 'ledgers.html#cash',
        'credit-ledger': 'ledgers.html#credit',
        'liability-register': 'ledgers.html#liability',

        'create-challan': 'challan.html',
        'track-payment': 'challan.html#track',
        'pmt-07': 'help.html#grievance',

        'search-hsn': 'gst-law.html#hsn',
        'notices': 'notices.html',
        'profile': 'profile.html',
        'grievance': 'help.html#grievance',
        'holiday-list': 'help.html#holidays',
        'locate-gstp': 'help.html#gstp',
        'generate-user-id': 'registration.html?type=unreg',

        'rfd-01': 'dashboard.html#refunds',
        'track-refund': 'track-status.html?type=refund',

        'cgst-act': 'gst-law.html#cgst',
        'igst-act': 'gst-law.html#igst',
        'utgst-act': 'gst-law.html#utgst',
        'sgst-acts': 'gst-law.html#sgst',
        'gst-rules': 'gst-law.html#rules',
        'central-tax-notif': 'gst-law.html#notifications',
        'integrated-tax-notif': 'gst-law.html#notifications',
        'circulars': 'gst-law.html#circulars',
        'amendments': 'gst-law.html#amendments',

        'returns-offline': 'downloads.html#returns',
        'gstr3b-offline': 'downloads.html#returns',
        'matching-tool': 'downloads.html#matching',
        'itc01-tool': 'downloads.html#returns',
        'gst-statistics': 'downloads.html#statistics',
        'excel-templates': 'downloads.html#templates',

        'search-gstin': 'search-taxpayer.html',
        'search-pan': 'search-taxpayer.html?by=pan',
        'search-composition': 'search-taxpayer.html?by=composition',

        'user-manuals': 'help.html#manuals',
        'system-requirements': 'help.html#system',
        'video-tutorials': 'help.html#videos',
        'advisories': 'help.html#advisories',
        'grievance-portal': 'help.html#grievance',
        'tollfree': 'help.html#helpdesk',
        'media-releases': 'help.html#helpdesk',

        'ewaybill': 'ewaybill.html',

        'hyperlink-policy': 'help.html#policy-hyperlink',
        'privacy-policy': 'help.html#policy-privacy',
        'terms-conditions': 'help.html#policy-terms',
        'disclaimer': 'help.html#policy-disclaimer'
      };

      if (routes[navKey]) {
        window.location.href = routes[navKey];
        return;
      }

      // Fallback: Dispatches custom event for the active module or displays notice
      var event = new CustomEvent('gstNavigate', { detail: { key: navKey, label: label } });
      window.dispatchEvent(event);

      this.showToast('Opening ' + label, 'info', 'GST Portal');
    },

    // ------------------------------------------------------------------------
    // Shell Initialization (Auto-mount or programmatic)
    // ------------------------------------------------------------------------
    initShell: function (options) {
      options = options || {};

      // Initialize user state (defaults to regular taxpayer for smooth simulation experience)
      if (!this.getUser()) {
        this.setUser('regular');
      }

      var topBarHtml = this.renderTopBar();
      var headerHtml = this.renderHeader();
      var navBarHtml = this.renderNavBar();
      var footerHtml = this.renderFooter();

      // Support split mounts
      var topMount = document.getElementById('gst-top-bar-mount');
      var headerMount = document.getElementById('gst-header-mount');
      var navMount = document.getElementById('gst-nav-bar-mount');
      var footerMount = document.getElementById('gst-footer-mount');

      if (topMount) topMount.innerHTML = topBarHtml;
      if (headerMount) headerMount.innerHTML = headerHtml;
      if (navMount) navMount.innerHTML = navBarHtml;

      // Support unified mount
      var unifiedHeader = document.getElementById('gst-header') || document.querySelector('header[data-shell]');
      if (unifiedHeader && !headerMount) {
        unifiedHeader.innerHTML = topBarHtml + headerHtml + navBarHtml;
      }

      // Render Breadcrumbs
      var breadcrumbEl = document.getElementById('gst-breadcrumbs');
      if (breadcrumbEl) {
        breadcrumbEl.innerHTML = this.renderBreadcrumbs(options.breadcrumbs);
      }

      // Render Footer (either #gst-footer or #gst-footer-mount)
      var footerEl = document.getElementById('gst-footer') || footerMount || document.querySelector('footer[data-shell]');
      if (footerEl) {
        footerEl.innerHTML = footerHtml;
      }

      // Bind all listeners
      this.bindEvents();
    },

    // ------------------------------------------------------------------------
    // SQLite Database Persistence Helper
    // ------------------------------------------------------------------------
    saveFormToDatabase: function(formName, data, section, gstin, fy, period) {
      try {
        var tp = this.getCurrentUser() || {};
        var payload = {
          formName: formName || 'FORM_ENTRY',
          section: section || '',
          gstin: gstin || tp.gstin || '',
          fy: fy || '2024-25',
          period: period || 'August',
          data: data || {}
        };
        return fetch('/api/form/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(res) { return res.json(); });
      } catch(e) {
        return Promise.reject(e);
      }
    },

    getFormSubmissions: function(formName, gstin, period, fy) {
      var params = new URLSearchParams();
      if (formName) params.append('formName', formName);
      if (gstin) params.append('gstin', gstin);
      if (period) params.append('period', period);
      if (fy) params.append('fy', fy);
      return fetch('/api/form/submissions?' + params.toString())
        .then(function(res) { return res.json(); });
    }
  };

  // Expose globally
  window.GSTSimulation = GSTSimulation;

  // Auto-init on DOMContentLoaded if placeholders exist
  document.addEventListener('DOMContentLoaded', function () {
    if (
      document.getElementById('gst-header') ||
      document.getElementById('gst-header-mount') ||
      document.getElementById('gst-footer') ||
      document.getElementById('gst-footer-mount') ||
      document.querySelector('[data-shell]')
    ) {
      GSTSimulation.initShell();
    }
  });

})(window, document);
