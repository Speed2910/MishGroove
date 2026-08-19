document.addEventListener("DOMContentLoaded", () => {
// Instancias de Gráficas para evitar duplicados en canvas
    let signatureLineChart = null;
    let signatureDonutChart = null;
    let adminLineChart = null;
    let adminDonutChart = null;
    let proLineChart = null; // <- Añadido
    let proDonutChart = null; // <- Añadido

    // ================= BASE DE DATOS LOCALSTORAGE =================
    if (!localStorage.getItem('mg_users')) {
        localStorage.setItem('mg_users', JSON.stringify([
            {name: "Admin", email: "admin@mg.com", password: "123", role: "administrador"},
            // Añadir usuarios de ejemplo con redes sociales para la demo del index
            {name: "Neon Pulse", email: "neon@pulse.com", password: "123", role: "cliente-+"},
            {name: "The Velvet Sounds", email: "velvet@sounds.com", password: "123", role: "cliente-p", socials: { youtube: 'https://youtube.com', spotify: 'https://spotify.com' }},
            {name: "Echoes of Jupiter", email: "echoes@jupiter.com", password: "123", role: "cliente-+"}
        ]));
    }
    if (!localStorage.getItem('mg_tracks')) {
        localStorage.setItem('mg_tracks', JSON.stringify([{id: 1, title: "Nebula Drive", genre: "Electrónica", artist: "Neon Pulse", uploaderEmail: "admin@mg.com", audioData: "", status: "aprobado", isPublic: true, plays: 1500}]));
    }
    if (!localStorage.getItem('mg_plus_requests')) localStorage.setItem('mg_plus_requests', JSON.stringify([]));
    if (!localStorage.getItem('mg_claims')) localStorage.setItem('mg_claims', JSON.stringify([])); 
    if (!localStorage.getItem('mg_del_requests')) localStorage.setItem('mg_del_requests', JSON.stringify([])); 
    if (!localStorage.getItem('mg_reservations')) localStorage.setItem('mg_reservations', JSON.stringify([]));

    if (!localStorage.getItem('mg_subscription_payments')) localStorage.setItem('mg_subscription_payments', JSON.stringify([]));
    if (!localStorage.getItem('mg_services_catalog')) {
        localStorage.setItem('mg_services_catalog', JSON.stringify([
            {id: 1, name: "Estudio A (Voces)", type: "Estudio", location: "Sede Central", schedule: "L-V 09:00 - 18:00", price: 50, image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400"},
            {id: 2, name: "Guitarra Fender Strat", type: "Instrumento", location: "Almacén", schedule: "L-S 08:00 - 20:00", price: 15, image: "https://images.unsplash.com/photo-1550291652-6ea9114a47b1?w=400"}
        ]));
    }
    if (!localStorage.getItem('mg_cart')) localStorage.setItem('mg_cart', JSON.stringify([]));

    const getDB = (key) => JSON.parse(localStorage.getItem(key));
    const saveDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    
    let currentUser = JSON.parse(sessionStorage.getItem('mg_current_user'));

    // ================= SISTEMA DE SONIDO UI =================
    // Pre-cargamos los sonidos desde la carpeta 'click' para una respuesta instantánea.
    const uiClickSounds = [
        new Audio('click/click1.wav'),
        new Audio('click/click2.wav')
    ];
    uiClickSounds.forEach(sound => sound.preload = 'auto'); // Sugerir al navegador que los cargue
    let lastSoundIndex = -1;

    const playUINavSound = () => {
        // Elegir un sonido diferente al anterior para que se sienta variado.
        let soundIndex = Math.floor(Math.random() * uiClickSounds.length);
        if (uiClickSounds.length > 1 && soundIndex === lastSoundIndex) {
            soundIndex = (soundIndex + 1) % uiClickSounds.length;
        }
        lastSoundIndex = soundIndex;
        const soundToPlay = uiClickSounds[soundIndex];
        soundToPlay.currentTime = 0; // Permite reproducir el sonido rápidamente varias veces.
        soundToPlay.play().catch(e => {}); // Evita errores en consola si el usuario hace clic muy rápido
    };

    // ================= SISTEMA DE TEMAS E IDIOMAS =================
    const body = document.body;
    const themes = ["theme-claro", "theme-alt", "theme-oscuro"];
    let currentThemeIndex = parseInt(localStorage.getItem('mg_theme_idx')) || 0;
    let currentLang = localStorage.getItem('mg_lang') || 'es';
    body.className = themes[currentThemeIndex];
    
    const updateFavicon = () => {
        const favicon = document.getElementById('favicon');
        if(favicon) {
            if(themes[currentThemeIndex] === 'theme-claro') favicon.href = 'icon/Claro/favicon-128x128.png';
            if(themes[currentThemeIndex] === 'theme-alt') favicon.href = 'icon/Alt/favicon-128x128.png';
            if(themes[currentThemeIndex] === 'theme-oscuro') favicon.href = 'icon/Oscuro/favicon-128x128.png';
        }
    };
    updateFavicon();

    const aplicarIdioma = () => {
        document.querySelectorAll('.lang').forEach(el => {
            if(el.hasAttribute(`data-${currentLang}`)) el.innerText = el.getAttribute(`data-${currentLang}`);
        });
        document.getElementById('current-lang-text') && (document.getElementById('current-lang-text').innerText = currentLang.toUpperCase());
    };
    aplicarIdioma();

    const setTema = (index) => {
        if (index === currentThemeIndex) return; // No hacer nada si es el mismo tema

        const mainContainer = document.querySelector('.glass-dashboard-container');
        mainContainer.classList.add('theme-fade-out');

        // Esperar a que la animación de salida termine para cambiar el tema
        setTimeout(() => {
            body.classList.remove(themes[currentThemeIndex]);
            currentThemeIndex = index;
            body.classList.add(themes[currentThemeIndex]);
            localStorage.setItem('mg_theme_idx', currentThemeIndex);
            updateFavicon();

            mainContainer.classList.remove('theme-fade-out');
        }, 250); // Debe coincidir con la duración de la animación en CSS
    };

    const setupDropdown = (btnId, menuId, isTheme) => {
        const btn = document.getElementById(btnId);
        const menu = document.getElementById(menuId);
        if(!btn || !menu) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-menu').forEach(m => { if(m.id !== menuId) m.classList.remove('active'); });
            menu.classList.toggle('active');
        });
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if(isTheme) setTema(parseInt(item.getAttribute('data-theme')));
                else {
                    currentLang = item.getAttribute('data-lang');
                    localStorage.setItem('mg_lang', currentLang);
                    aplicarIdioma();
                }
                menu.classList.remove('active');
            });
        });
    };
    setupDropdown('theme-menu-btn', 'theme-menu', true);
    setupDropdown('lang-menu-btn', 'lang-menu', false);
    document.addEventListener('click', () => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active')));

    window.registerPlay = (trackId) => {
        const tracks = getDB('mg_tracks');
        const track = tracks.find(t => t.id === trackId);
        if(track) {
            track.plays = (track.plays || 0) + 1;
            saveDB('mg_tracks', tracks);
            const playBadge = document.getElementById(`play-count-${trackId}`);
            if(playBadge) playBadge.innerText = `🎧 ${track.plays}`;
            
            // Actualizar estadísticas si están abiertas
            if (currentUser) {
                calculateUserStats();
                if (currentUser.role === 'administrador') renderAdminStats();
            }
        }
    };

    // ================= INDEX & LOGIN =================
    const loginModal = document.getElementById("login-modal");
    if(loginModal) {
        document.getElementById("pill-login-trigger")?.addEventListener("click", () => {
            document.getElementById("login-view").classList.add("active");
            document.getElementById("register-view").classList.remove("active");
            loginModal.classList.add("active");
        });
        document.getElementById("pill-register-trigger")?.addEventListener("click", () => {
            document.getElementById("register-view").classList.add("active");
            document.getElementById("login-view").classList.remove("active");
            loginModal.classList.add("active");
        });

        // Añadir sonido a los botones de la barra de navegación superior
        document.querySelectorAll('.pill-right-actions button, .pill-center-controls button').forEach(btn => {
            btn.addEventListener('click', playUINavSound);
        });
        // Añadir sonido a los enlaces de la barra lateral
        document.querySelectorAll('.sidebar .nav-links a').forEach(link => link.addEventListener('click', playUINavSound));

        document.getElementById("close-login-btn")?.addEventListener("click", () => loginModal.classList.remove("active"));
        document.getElementById("go-to-register")?.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("login-view").classList.remove("active"); document.getElementById("register-view").classList.add("active"); });
        document.getElementById("go-to-login")?.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("register-view").classList.remove("active"); document.getElementById("login-view").classList.add("active"); });

        // Lógica para mostrar redes sociales en el index
        const renderArtistSocials = () => {
            document.querySelectorAll('.artist-socials').forEach(container => {
                const artistEmail = container.getAttribute('data-artist-email');
                if (!artistEmail) return;

                const users = getDB('mg_users');
                const artist = users.find(u => u.email === artistEmail);

                if (artist && artist.socials) {
                    let socialHTML = '';
                    if (artist.socials.youtube) {
                        socialHTML += `<a href="${artist.socials.youtube}" target="_blank" rel="noopener noreferrer"><img src="https://simpleicons.org/icons/youtube.svg" class="social-icon" alt="YouTube"></a>`;
                    }
                    if (artist.socials.instagram) {
                        socialHTML += `<a href="${artist.socials.instagram}" target="_blank" rel="noopener noreferrer"><img src="https://simpleicons.org/icons/instagram.svg" class="social-icon" alt="Instagram"></a>`;
                    }
                    if (artist.socials.spotify) {
                        socialHTML += `<a href="${artist.socials.spotify}" target="_blank" rel="noopener noreferrer"><img src="https://simpleicons.org/icons/spotify.svg" class="social-icon" alt="Spotify"></a>`;
                    }
                    container.innerHTML = socialHTML;
                }
            });
        };

        // Llamar a la función si estamos en index.html
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
            renderArtistSocials();
        }

        let selectedRegRole = 'cliente-np'; 
        const regRoleCards = document.querySelectorAll("#reg-role-selector .role-card");
        regRoleCards.forEach(card => {
            card.addEventListener("click", () => {
                regRoleCards.forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                selectedRegRole = card.getAttribute("data-role");
                document.getElementById("payment-fields").style.display = selectedRegRole === 'cliente-p' ? "block" : "none";
            });
        });

        document.getElementById("register-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const users = getDB('mg_users');
            const email = document.getElementById("reg-email").value;
            const dob = new Date(document.getElementById("reg-dob").value);
            const age = Math.floor((new Date() - dob) / 31557600000);

            if (age < 18) {
                return alert("Debes ser mayor de 18 años para registrarte.");
            }

            if(users.find(u => u.email === email)) return alert("El correo ya existe");
            
            // Si el usuario elige ser Pro, se registra como 'np' y se crea una solicitud de pago.
            const finalRole = selectedRegRole === 'cliente-p' ? 'cliente-np' : selectedRegRole;
            users.push({ name: document.getElementById("reg-name").value, email: email, password: document.getElementById("reg-password").value, role: finalRole, dob: document.getElementById("reg-dob").value, profilePic: null, socials: {} });
            saveDB('mg_users', users);

            if (selectedRegRole === 'cliente-p') {
                const payments = getDB('mg_subscription_payments');
                payments.push({
                    id: Date.now(),
                    userEmail: email,
                    userName: document.getElementById("reg-name").value,
                    bankName: document.getElementById("reg-bank-name").value,
                    transactionRef: document.getElementById("reg-transaction-ref").value,
                    status: 'pendiente'
                });
                saveDB('mg_subscription_payments', payments);
                alert("Cuenta creada. Su pago de suscripción está en proceso, espere hasta 24 horas para su revisión. Puede iniciar sesión con su plan Essential.");
            } else {
                alert("Cuenta creada. Inicia sesión.");
            }
            document.getElementById("go-to-login").click();
        });

        document.getElementById("login-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const users = getDB('mg_users');
            const email = document.getElementById("login-email").value;
            const pass = document.getElementById("login-password").value;
            const user = users.find(u => u.email === email && u.password === pass);

            if(user) {
                sessionStorage.setItem('mg_current_user', JSON.stringify(user));
                const roleRoutes = { 'administrador': 'admin.html', 'cliente-np': 'essential.html', 'cliente-p': 'pro.html', 'cliente-+': 'signature.html' };
                window.location.href = roleRoutes[user.role] || 'index.html';
            } else alert("Credenciales incorrectas");
        });
    }

    // ================= GENERADOR DE TRACKS HTML =================
    const generateTrackHTML = (t, isAdmin = false, isOwner = false) => {
        let audioPlayer = t.audioData ? `<audio controls class="custom-audio-player" src="${t.audioData}" onplay="registerPlay(${t.id})"></audio>` : `<p style="font-size:11px; opacity:0.6;">[Pista Vacía / Simulada]</p>`;
        let statusColor = t.status === 'aprobado' ? '#22c55e' : t.status === 'rechazado' ? '#ef4444' : '#f59e0b';
        
        let delReqBadge = '';
        if(isOwner) {
            const delReqs = getDB('mg_del_requests').find(r => r.trackId === t.id);
            if(delReqs) delReqBadge = `<p style="font-size:11px; color:#ef4444; margin-top:5px; font-weight:bold;">↳ Estado Eliminación: ${delReqs.status.toUpperCase()} ${delReqs.reason ? '('+delReqs.reason+')' : ''}</p>`;
        }

        let adminControls = isAdmin ? `
            <div class="admin-actions" style="margin-top:10px;">
                ${t.status === 'pendiente' ? `<button class="btn-table-action btn-success approve-btn" data-id="${t.id}">Aprobar</button><button class="btn-table-action btn-danger reject-btn" data-id="${t.id}">Rechazar</button>` : ''}
                <button class="btn-table-action btn-danger delete-track-btn" data-id="${t.id}">Eliminar Inmediato</button>
            </div>
        ` : (isOwner ? `<div style="margin-top:10px;"><button class="btn-table-action req-del-track-btn" data-id="${t.id}" data-title="${t.title}">Solicitar Eliminación</button></div>` : '');

        return `
            <div class="track-item">
                <div class="track-header">
                    <div class="track-info">
                        <p class="track-title">${t.title}</p>
                        <p class="track-artist">${t.artist} <span class="track-badge" style="background:var(--input-bg);">${t.genre}</span></p>
                    </div>
                    <div>
                        <span class="track-badge" style="background:${statusColor}; color:#fff;">${t.status.toUpperCase()}</span>
                        <span class="track-badge" style="background:${t.isPublic?'#3b82f6':'#6b7280'}; color:#fff;">${t.isPublic?'PÚBLICO':'PRIVADO'}</span>
                    </div>
                </div>
                ${audioPlayer}
                <div class="track-stats"><span id="play-count-${t.id}">🎧 ${t.plays || 0}</span></div>
                ${delReqBadge}
                ${adminControls}
            </div>
        `;
    };

    // ================= PÁGINA CATÁLOGO GLOBAL =================
    const publicCatalogList = document.getElementById("public-catalog-list");
    if(publicCatalogList) {
        const publicTracks = getDB('mg_tracks').filter(t => t.status === 'aprobado' && t.isPublic === true);
        publicCatalogList.innerHTML = publicTracks.length ? publicTracks.map(t => generateTrackHTML(t, false, false)).join('') : '<p>No hay pistas públicas.</p>';
    }

    // ================= LOGICA CLIENTES (DASHBOARDS) =================
    if(currentUser && window.location.pathname.match(/essential|pro|signature/)) {
        document.getElementById("user-greeting") && (document.getElementById("user-greeting").innerText = `Hola, ${currentUser.name}`);
        
        const picDisplay = document.getElementById("profile-pic-display");
        if(picDisplay) {
            if(currentUser.profilePic) {
                picDisplay.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                picDisplay.innerHTML = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
            }
        }

        const tabs = document.querySelectorAll('.tab-trigger');
        const views = document.querySelectorAll('.dashboard-view');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                views.forEach(v => v.classList.remove('active'));
                const targetView = document.getElementById(e.currentTarget.getAttribute('data-target'));
                targetView?.classList.add('active');

                // Si se activa la pestaña de estadísticas, renderizar gráficas
                if (e.currentTarget.getAttribute('data-target') === 'view-stats') {
                    calculateUserStats();
                }
            });
        });

        // Añadir sonido a los botones de navegación del dashboard
        document.querySelectorAll('.db-menu .menu-item, .sidebar-controls-footer button, .btn-promo-upgrade').forEach(btn => {
            btn.addEventListener('click', playUINavSound);
        });

        document.getElementById("save-pic-btn")?.addEventListener("click", () => {
            const file = document.getElementById("profile-pic-input").files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentUser.profilePic = e.target.result;
                    sessionStorage.setItem('mg_current_user', JSON.stringify(currentUser));
                    const users = getDB('mg_users');
                    const userIndex = users.findIndex(u => u.email === currentUser.email);
                    if(userIndex !== -1) {
                        users[userIndex].profilePic = e.target.result;
                        saveDB('mg_users', users);
                    }
                    if(picDisplay) picDisplay.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                    alert("Foto actualizada");
                };
                reader.readAsDataURL(file);
            }
        });

        // Lógica para guardar redes sociales
        const socialsForm = document.getElementById("socials-form");
        if (socialsForm) {
            // Rellenar los campos con los datos existentes
            if (currentUser.socials) {
                document.getElementById('social-youtube').value = currentUser.socials.youtube || '';
                document.getElementById('social-instagram').value = currentUser.socials.instagram || '';
                document.getElementById('social-spotify').value = currentUser.socials.spotify || '';
            }

            socialsForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const socials = {
                    youtube: document.getElementById('social-youtube').value,
                    instagram: document.getElementById('social-instagram').value,
                    spotify: document.getElementById('social-spotify').value,
                };

                currentUser.socials = socials;
                sessionStorage.setItem('mg_current_user', JSON.stringify(currentUser));

                const users = getDB('mg_users');
                const userIndex = users.findIndex(u => u.email === currentUser.email);
                if (userIndex !== -1) users[userIndex].socials = socials;
                saveDB('mg_users', users);
                alert("Redes sociales actualizadas.");
            });
        }

        // ================= CÁLCULOS E INSIGHTS FINANCIEROS (ARTISTA) =================
        const calculateUserStats = () => {
            const myTracks = getDB('mg_tracks').filter(t => t.uploaderEmail === currentUser.email);
            const totalListens = myTracks.reduce((sum, track) => sum + (track.plays || 0), 0);
            const estimatedRevenue = totalListens * 0.005;

            document.getElementById("stats-listens") && (document.getElementById("stats-listens").innerText = totalListens.toLocaleString());
            document.getElementById("stats-followers") && (document.getElementById("stats-followers").innerText = (myTracks.length * 15).toLocaleString());
            document.getElementById("stats-reach") && (document.getElementById("stats-reach").innerText = "+" + (myTracks.length * 2.5).toFixed(1) + "%");
            
            const revenueEl = document.getElementById("stats-revenue");
            // Modificación: Permitir que los usuarios Pro también vean su Revenue calculado
            if (revenueEl && (currentUser.role === 'cliente-+' || currentUser.role === 'cliente-p')) {
                revenueEl.innerText = `$${estimatedRevenue.toFixed(2)}`;
            }

            const rpmEl = document.getElementById("stats-rpm");
            if (rpmEl) {
                rpmEl.innerText = totalListens > 0 ? `$${((estimatedRevenue / totalListens) * 1000).toFixed(2)}` : "$5.00";
            }

            // Renderizar gráficas dependiendo del rol
            if (currentUser.role === 'cliente-+') {
                renderSignatureCharts(myTracks, estimatedRevenue);
                renderSignatureFinancialTable(myTracks);
            } else if (currentUser.role === 'cliente-p') {
                renderProCharts(myTracks, estimatedRevenue);
                renderProFinancialTable(myTracks);
            }
        };

        const renderSignatureCharts = (myTracks, estimatedRevenue) => {
            const ctxLine = document.getElementById('signature-financial-chart');
            const ctxDonut = document.getElementById('signature-revenue-donut');
            if (!ctxLine || !ctxDonut || typeof Chart === 'undefined') return;

            const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            const multipliers = [0.08, 0.12, 0.15, 0.22, 0.18, 0.14, 0.11];
            const dailyData = multipliers.map(m => (estimatedRevenue * m).toFixed(2));

            if (signatureLineChart) signatureLineChart.destroy();
            signatureLineChart = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Ingresos ($ USD)',
                        data: dailyData,
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.18)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#a855f7',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.08)' } },
                        x: { grid: { display: false } }
                    }
                }
            });

            const trackLabels = myTracks.map(t => t.title).slice(0, 5);
            const trackRevenues = myTracks.map(t => ((t.plays || 0) * 0.005).toFixed(2)).slice(0, 5);

            if (trackLabels.length === 0) {
                trackLabels.push("Sin pistas");
                trackRevenues.push(0);
            }

            if (signatureDonutChart) signatureDonutChart.destroy();
            signatureDonutChart = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: trackLabels,
                    datasets: [{
                        data: trackRevenues,
                        backgroundColor: ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
                        borderWidth: 2,
                        borderColor: 'transparent'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }
                    }
                }
            });
        };

        const renderSignatureFinancialTable = (myTracks) => {
            const tableBody = document.getElementById('signature-financial-table-body');
            if (!tableBody) return;

            if (myTracks.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No tienes pistas registradas en tu catálogo aún.</td></tr>`;
                return;
            }

            tableBody.innerHTML = myTracks.map(t => {
                const plays = t.plays || 0;
                const revenue = (plays * 0.005).toFixed(2);
                return `
                    <tr>
                        <td><strong>${t.title}</strong></td>
                        <td><span class="track-badge">${t.genre}</span></td>
                        <td>🎧 ${plays.toLocaleString()}</td>
                        <td>$0.005 USD</td>
                        <td><strong style="color:#22c55e;">$${revenue}</strong></td>
                        <td><span class="track-badge" style="background:#22c55e; color:#fff;">Acreditado</span></td>
                    </tr>
                `;
            }).join('');
        };

        const renderProCharts = (myTracks, estimatedRevenue) => {
            const ctxLine = document.getElementById('pro-financial-chart');
            const ctxDonut = document.getElementById('pro-revenue-donut');
            if (!ctxLine || !ctxDonut || typeof Chart === 'undefined') return;

            const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            const multipliers = [0.08, 0.12, 0.15, 0.22, 0.18, 0.14, 0.11];
            const dailyData = multipliers.map(m => (estimatedRevenue * m).toFixed(2));

            if (proLineChart) proLineChart.destroy();
            proLineChart = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Ingresos ($ USD)',
                        data: dailyData,
                        borderColor: '#3b82f6', // Color primario de Pro (Azul)
                        backgroundColor: 'rgba(59, 130, 246, 0.18)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#3b82f6',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.08)' } },
                        x: { grid: { display: false } }
                    }
                }
            });

            const trackLabels = myTracks.map(t => t.title).slice(0, 5);
            const trackRevenues = myTracks.map(t => ((t.plays || 0) * 0.005).toFixed(2)).slice(0, 5);

            if (trackLabels.length === 0) {
                trackLabels.push("Sin pistas");
                trackRevenues.push(0);
            }

            if (proDonutChart) proDonutChart.destroy();
            proDonutChart = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: trackLabels,
                    datasets: [{
                        data: trackRevenues,
                        // Paleta adaptada al ambiente Pro
                        backgroundColor: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899'],
                        borderWidth: 2,
                        borderColor: 'transparent'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }
                    }
                }
            });
        };

        const renderProFinancialTable = (myTracks) => {
            const tableBody = document.getElementById('pro-financial-table-body');
            if (!tableBody) return;

            if (myTracks.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No tienes pistas registradas en tu catálogo aún.</td></tr>`;
                return;
            }

            tableBody.innerHTML = myTracks.map(t => {
                const plays = t.plays || 0;
                const revenue = (plays * 0.005).toFixed(2);
                return `
                    <tr>
                        <td><strong>${t.title}</strong></td>
                        <td><span class="track-badge">${t.genre}</span></td>
                        <td>🎧 ${plays.toLocaleString()}</td>
                        <td>$0.005 USD</td>
                        <td><strong style="color:#3b82f6;">$${revenue}</strong></td>
                        <td><span class="track-badge" style="background:#3b82f6; color:#fff;">Monetizando</span></td>
                    </tr>
                `;
            }).join('');
        };

        const renderUserTracks = () => {
            const list = document.getElementById("user-track-list");
            if(list) {
                const myTracks = getDB('mg_tracks').filter(t => t.uploaderEmail === currentUser.email);
                list.innerHTML = myTracks.length ? myTracks.map(t => generateTrackHTML(t, false, true)).join('') : '<p>No tienes pistas.</p>';
                
                document.querySelectorAll('.req-del-track-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        if(confirm("¿Seguro que deseas solicitar la eliminación a un administrador?")) {
                            const reqs = getDB('mg_del_requests');
                            reqs.push({id: Date.now(), trackId: parseInt(e.target.dataset.id), trackTitle: e.target.dataset.title, userId: currentUser.email, status: 'pendiente', reason: ''});
                            saveDB('mg_del_requests', reqs);
                            alert("Solicitud enviada al administrador.");
                            renderUserTracks();
                        }
                    });
                });
            }
        };

        const dropZone = document.getElementById("drop-zone");
        const trackFileInput = document.getElementById("track-file");
        let currentFileData = ""; 
        if(dropZone && trackFileInput) {
            dropZone.addEventListener('click', () => trackFileInput.click());
            trackFileInput.addEventListener('change', (e) => {
                if(e.target.files[0]) {
                    currentFileData = URL.createObjectURL(e.target.files[0]); 
                    dropZone.innerHTML = `<p style="color:#22c55e;">🎵 Archivo cargado temporalmente</p>`;
                }
            });
            document.getElementById("upload-track-form").addEventListener("submit", (e) => {
                e.preventDefault();
                const tracks = getDB('mg_tracks');
                tracks.push({ 
                    id: Date.now(), title: document.getElementById("track-title").value, 
                    genre: document.getElementById("track-genre").value, artist: currentUser.name, 
                    uploaderEmail: currentUser.email, audioData: currentFileData, status: "pendiente",
                    isPublic: document.getElementById("track-public") ? document.getElementById("track-public").checked : false, plays: 0
                });
                saveDB('mg_tracks', tracks);
                e.target.reset(); dropZone.innerHTML = `<p>Arrastra tu Master</p>`;
                renderUserTracks(); calculateUserStats();
                document.querySelector('[data-target="view-catalog"]')?.click();
            });
        }

        const renderUserClaims = () => {
            const claimsList = document.getElementById("user-claims-list");
            if(claimsList) {
                const myClaims = getDB('mg_claims').filter(c => c.userId === currentUser.email);
                claimsList.innerHTML = myClaims.map(c => `
                    <div class="chat-message">
                        <div class="chat-message-header"><span>Tú</span> <span>${c.status.toUpperCase()}</span></div>
                        <p style="font-size:13px;">${c.question}</p>
                    </div>
                    ${c.answer ? `<div class="chat-message admin-reply">
                        <div class="chat-message-header"><span style="color:#a855f7; font-weight:bold;">Admin Support</span></div>
                        <p style="font-size:13px;">${c.answer}</p>
                    </div>` : ''}
                `).join('');
            }
        };

        document.getElementById("claim-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const q = document.getElementById("claim-text").value;
            const claims = getDB('mg_claims');
            claims.push({ id: Date.now(), userId: currentUser.email, userName: currentUser.name, question: q, answer: "", status: "pendiente" });
            saveDB('mg_claims', claims);
            e.target.reset();
            renderUserClaims();
        });

        let userCart = [];
        const renderCatalogServices = () => {
            const list = document.getElementById("services-catalog-list");
            if(list) {
                const items = getDB('mg_services_catalog');
                list.innerHTML = items.map(i => `
                    <div class="reservation-card">
                        <img src="${i.image}" alt="${i.name}">
                        <div class="reservation-info">
                            <strong>${i.name}</strong> <span class="track-badge">${i.type}</span><br>
                            Ubicación: ${i.location}<br>Horario: ${i.schedule}<br>
                            Precio: $${i.price} (Gratis si eres Signature)
                        </div>
                        <button class="btn-table-action btn-primary add-to-cart-btn" data-id="${i.id}">Agregar al Carrito</button>
                    </div>
                `).join('');
                document.querySelectorAll('.add-to-cart-btn').forEach(btn => btn.addEventListener('click', (e) => {
                    // VALIDACIÓN DE USUARIO ESSENTIAL
                    if (currentUser && currentUser.role === 'cliente-np') {
                        alert("Acción no permitida: Tu plan Essential no incluye reserva de estudios. Mejora a Pro en Ajustes.");
                        return;
                    }
                    const id = parseInt(e.target.dataset.id);
                    const item = getDB('mg_services_catalog').find(x => x.id === id);
                    userCart.push(item);
                    renderCart();
                }));
            }
        };

        const renderCart = () => {
            const cartDiv = document.getElementById("user-cart-items");
            const totalDiv = document.getElementById("user-cart-total");
            if(cartDiv && totalDiv) {
                cartDiv.innerHTML = userCart.map((i, index) => `
                    <div class="cart-item">
                        <span>${i.name}</span>
                        <span>$${i.price} <button class="btn-table-action btn-danger" onclick="window.removeCart(${index})">X</button></span>
                    </div>
                `).join('');
                
                let subtotal = userCart.reduce((acc, i) => acc + i.price, 0);
                if(currentUser.role === 'cliente-+') subtotal = 0; 
                totalDiv.innerText = `Total: $${subtotal}`;
            }
        };

        window.removeCart = (index) => { userCart.splice(index, 1); renderCart(); };
        
        document.getElementById("checkout-btn")?.addEventListener("click", () => {
            if(userCart.length === 0) return alert("El carrito está vacío");
            
            const dateInput = document.getElementById("reservation-date");
            if(dateInput && !dateInput.value) return alert("Por favor, selecciona una fecha en el calendario.");
            
            const reservations = getDB('mg_reservations');
            userCart.forEach(item => {
                reservations.push({
                    id: Date.now() + Math.random(),
                    userId: currentUser.email,
                    userName: currentUser.name,
                    serviceId: item.id,
                    serviceName: item.name,
                    date: dateInput ? dateInput.value : 'No especificada',
                    price: currentUser.role === 'cliente-+' ? 0 : item.price,
                    status: 'pendiente'
                });
            });
            saveDB('mg_reservations', reservations);
            
            alert("Reserva enviada exitosamente. El administrador confirmará el espacio en la fecha solicitada.");
            userCart = []; 
            if(dateInput) dateInput.value = '';
            renderCart();
        });

        document.getElementById("plus-request-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const dob = new Date(document.getElementById("req-dob").value);
            const age = Math.floor((new Date() - dob) / 31557600000);
            if(age < 18) return alert("Debes ser mayor de 18 años para aplicar.");
            
            const reqs = getDB('mg_plus_requests');
            reqs.push({ 
                id: Date.now(), userName: currentUser.name, email: currentUser.email, 
                dob: document.getElementById("req-dob").value, type: document.getElementById("req-music-type").value,
                link: document.getElementById("req-link").value, reason: document.getElementById("req-reason").value, status: 'pendiente' 
            });
            saveDB('mg_plus_requests', reqs);
            alert("Solicitud enviada a revisión técnica."); e.target.reset();
        });

        // Lógica para el formulario de mejora a Pro desde el dashboard
        document.getElementById("upgrade-to-pro-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!currentUser) return alert("Debes iniciar sesión.");

            const bankName = document.getElementById("upgrade-bank-name").value;
            const transactionRef = document.getElementById("upgrade-transaction-ref").value;

            const payments = getDB('mg_subscription_payments');
            payments.push({
                id: Date.now(),
                userEmail: currentUser.email,
                userName: currentUser.name,
                bankName: bankName,
                transactionRef: transactionRef,
                status: 'pendiente'
            });
            saveDB('mg_subscription_payments', payments);
            alert("¡Gracias! Su pago de suscripción está en proceso. Espere hasta 24 horas para su revisión. El panel se recargará.");
            window.location.reload();
        });

        // ================= LÓGICA DEL METRÓNOMO =================
        const bpmDisplay = document.getElementById('metronome-bpm-display');
        const knob = document.getElementById('metronome-knob');
        const slider = document.getElementById('metronome-slider'); // Para la lógica antigua
        const startStopBtn = document.getElementById('metronome-start-stop-btn');
        const led = document.querySelector('.metronome-led');
        const signatureBtn = document.getElementById('metronome-signature-btn');

        let bpm = 120;
        let timerId = null;
        let beatCount = 0;
        const signatures = [[4, 4], [3, 4], [2, 4], [6, 8]];
        let signatureIndex = 0;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Lógica unificada para el tick del metrónomo
        const playTick = (isAccent) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(isAccent ? 980 : 780, audioContext.currentTime);
            gainNode.gain.setValueAtTime(isAccent ? 1.0 : 0.6, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);

            led?.classList.add('active');
            if (isAccent) led?.classList.add('accent');
            setTimeout(() => {
                led?.classList.remove('active');
                led?.classList.remove('accent');
            }, 100);
        };

        const metronomeLoop = () => {
            const [beats] = signatures[signatureIndex];
            const isAccent = beatCount % beats === 0;
            playTick(isAccent);
            beatCount++;
        };

        const updateMetronome = () => {
            if (bpmDisplay) bpmDisplay.textContent = bpm;
            if (knob) {
                const rotation = ((bpm - 40) / 200) * 270 - 135;
                knob.style.transform = `rotate(${rotation}deg)`;
            }
            if (slider) slider.value = bpm;
        };

        let isRunning = false; // Estado del metrónomo
        knob?.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (isRunning) { // Si está corriendo, detenemos el loop para evitar bugs al cambiar BPM
                clearInterval(timerId);
            }
            const startX = e.clientX;
            const startBPM = bpm;
            const onMouseMove = (moveEvent) => {
                const diffX = moveEvent.clientX - startX;
                bpm = Math.round(Math.max(40, Math.min(240, startBPM + diffX * 0.5))); // Ajusta la sensibilidad
                updateMetronome(); // Actualiza solo la parte visual (número y rotación)
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                // Solo cuando se suelta el clic, se reanuda el loop con el BPM final
                if (isRunning) { 
                    timerId = setInterval(metronomeLoop, (60 / bpm) * 1000);
                }
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Se elimina la lógica de los botones +/- y el slider que ya no se usan en essential.html

        startStopBtn?.addEventListener('click', () => {
            isRunning = !isRunning;
            startStopBtn.textContent = isRunning ? 'Detener' : 'Iniciar';
            if (isRunning) { beatCount = 0; metronomeLoop(); timerId = setInterval(metronomeLoop, (60 / bpm) * 1000); } 
            else { clearInterval(timerId); beatCount = 0; }
        });

        signatureBtn?.addEventListener('click', () => {
            signatureIndex = (signatureIndex + 1) % signatures.length;
            signatureBtn.textContent = `Compás: ${signatures[signatureIndex].join('/')}`;
            if (isRunning) { // Reiniciar el conteo si el compás cambia mientras corre
                beatCount = 0;
            }
        });

        renderUserTracks(); calculateUserStats(); renderUserClaims(); renderCatalogServices(); renderCart(); updateMetronome();
    }

    // ================= LOGICA ADMINISTRADOR =================
    if(currentUser && currentUser.role === 'administrador') {
        const tabs = document.querySelectorAll('.tab-trigger');
        const views = document.querySelectorAll('.dashboard-view');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                views.forEach(v => v.classList.remove('active'));
                const targetView = document.getElementById(e.currentTarget.getAttribute('data-target'));
                targetView?.classList.add('active');

                if (e.currentTarget.getAttribute('data-target') === 'view-global-stats') {
                    renderAdminStats();
                }
            });
        });

        // Añadir sonido a los botones de navegación del dashboard de Admin
        document.querySelectorAll('.db-menu .menu-item, .sidebar-controls-footer button').forEach(btn => {
            btn.addEventListener('click', playUINavSound);
        });

        const renderAdminTracks = () => {
            const allTracks = getDB('mg_tracks');
            document.getElementById("admin-pending-list").innerHTML = allTracks.filter(t => t.status === 'pendiente').map(t => generateTrackHTML(t, true)).join('');
            document.getElementById("admin-all-tracks-list").innerHTML = allTracks.map(t => generateTrackHTML(t, true)).join('');
            
            document.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', (e) => updateTrackStatus(e.target.dataset.id, 'aprobado')));
            document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', (e) => updateTrackStatus(e.target.dataset.id, 'rechazado')));
            document.querySelectorAll('.delete-track-btn').forEach(btn => btn.addEventListener('click', (e) => { if(confirm("¿Eliminar pista?")) { let tr = getDB('mg_tracks').filter(t => t.id != e.target.dataset.id); saveDB('mg_tracks', tr); renderAdminTracks(); renderAdminStats(); }}));
        };

        const updateTrackStatus = (id, status) => { const tr = getDB('mg_tracks'); tr.find(t => t.id == id).status = status; saveDB('mg_tracks', tr); renderAdminTracks(); };

        const renderAdminUsers = () => {
            const users = getDB('mg_users').filter(u => u.role !== 'administrador');
            document.getElementById("admin-user-list").innerHTML = users.map(u => `
                <div class="admin-track-item admin-user-info">
                    <img src="${u.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name || 'U') + '&background=3b3c4a&color=fff'}" class="admin-user-avatar" style="object-fit: cover; border-radius: 50%;">
                    <div style="flex-grow:1; margin-left: 10px;">
                        <strong>${u.name}</strong> <span class="track-badge">${u.role}</span><br>
                        <span style="font-size:11px;">${u.email}</span>
                    </div>
                    <div class="admin-actions">
                        <select class="role-select-admin btn-table-action" data-email="${u.email}">
                            <option value="cliente-np" ${u.role === 'cliente-np' ? 'selected' : ''}>Essential</option>
                            <option value="cliente-p" ${u.role === 'cliente-p' ? 'selected' : ''}>Pro</option>
                            <option value="cliente-+" ${u.role === 'cliente-+' ? 'selected' : ''}>Signature</option>
                        </select>
                    </div>
                </div>
            `).join('');
            document.querySelectorAll('.role-select-admin').forEach(sel => sel.addEventListener('change', (e) => {
                const u = getDB('mg_users'); u.find(x => x.email === e.target.dataset.email).role = e.target.value; saveDB('mg_users', u); alert("Rol actualizado");
            }));
        };

        const renderAdminDelReqs = () => {
            const reqs = getDB('mg_del_requests').filter(r => r.status === 'pendiente');
            document.getElementById("admin-del-requests-list").innerHTML = reqs.map(r => `
                <div class="admin-track-item">
                    <p><strong>Usuario:</strong> ${r.userId} quiere eliminar <strong>"${r.trackTitle}"</strong></p>
                    <div class="admin-actions">
                        <button class="btn-table-action btn-danger" onclick="window.resolveDel(${r.id}, true)">Aprobar y Eliminar</button>
                        <button class="btn-table-action btn-success" onclick="window.resolveDel(${r.id}, false)">Rechazar</button>
                    </div>
                </div>
            `).join('');
        };

        window.resolveDel = (id, isApprove) => {
            const reqs = getDB('mg_del_requests');
            const index = reqs.findIndex(r => r.id === id);
            if(isApprove) {
                let tracks = getDB('mg_tracks').filter(t => t.id !== reqs[index].trackId);
                saveDB('mg_tracks', tracks);
                reqs[index].status = 'aprobado';
                reqs[index].reason = 'Eliminado por Admin';
            } else {
                let reason = prompt("Razón del rechazo:");
                reqs[index].status = 'rechazado';
                reqs[index].reason = reason || 'No especificado';
            }
            saveDB('mg_del_requests', reqs);
            renderAdminDelReqs(); renderAdminTracks(); renderAdminStats();
        };

        const renderAdminClaims = () => {
            const claims = getDB('mg_claims').filter(c => c.status === 'pendiente');
            document.getElementById("admin-claims-list").innerHTML = claims.map(c => `
                <div class="chat-message">
                    <p style="font-size:11px;"><strong>${c.userName} (${c.userId})</strong></p>
                    <p>${c.question}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <input type="text" id="reply-${c.id}" placeholder="Escribe tu respuesta..." style="flex-grow:1; padding:5px; border-radius:5px; border:1px solid #ccc;">
                        <button class="btn-table-action btn-primary" onclick="window.replyClaim(${c.id})">Enviar</button>
                    </div>
                </div>
            `).join('');
        };

        window.replyClaim = (id) => {
            const reply = document.getElementById(`reply-${id}`).value;
            const claims = getDB('mg_claims');
            const c = claims.find(x => x.id === id);
            c.answer = reply; c.status = 'resuelto';
            saveDB('mg_claims', claims); renderAdminClaims();
        };

        const renderAdminServices = () => {
            const items = getDB('mg_services_catalog');
            document.getElementById("admin-services-list").innerHTML = items.map(i => `
                <div class="admin-track-item">
                    <span><strong>${i.name} (${i.type})</strong> - $${i.price}</span>
                    <button class="btn-table-action btn-danger" onclick="window.delService(${i.id})">Quitar</button>
                </div>
            `).join('');
        };
        
        const renderAdminReservations = () => {
            const list = document.getElementById("admin-reservations-list");
            if(!list) return;
            const res = getDB('mg_reservations');
            list.innerHTML = res.length ? res.map(r => `
                <div class="admin-track-item">
                    <div>
                        <strong>${r.serviceName}</strong> solicitado por <strong>${r.userName}</strong><br>
                        <span style="font-size:13px; color:var(--text-color);">📅 Fecha Solicitada: <strong>${r.date}</strong></span><br>
                        <span style="font-size:11px;">Estado actual: ${r.status.toUpperCase()}</span>
                    </div>
                    ${r.status === 'pendiente' ? `
                    <div class="admin-actions">
                        <button class="btn-table-action btn-success" onclick="window.updateReservation(${r.id}, 'aceptada')">Aceptar Fecha</button>
                        <button class="btn-danger" onclick="window.updateReservation(${r.id}, 'rechazada')">Declinar</button>
                    </div>` : `<div><span class="track-badge">${r.status.toUpperCase()}</span></div>`}
                </div>
            `).join('') : '<p style="font-size:14px; opacity:0.7;">No hay solicitudes de reserva en el calendario.</p>';
        };

        window.updateReservation = (id, status) => {
            const res = getDB('mg_reservations');
            const item = res.find(r => r.id === id);
            if(item) item.status = status;
            saveDB('mg_reservations', res);
            renderAdminReservations();
        };

        const renderSubscriptionPayments = () => {
            const list = document.getElementById("admin-payments-list");
            if (!list) return;
            const payments = getDB('mg_subscription_payments');

            const statusStyles = {
                pendiente: 'background:#f59e0b; color:#fff;',
                aceptado: 'background:#22c55e; color:#fff;',
                rechazado: 'background:#ef4444; color:#fff;'
            };

            list.innerHTML = payments.length ? payments.map(p => `
                <div class="admin-track-item">
                    <div>
                        <strong>Usuario:</strong> ${p.userName} (${p.userEmail})<br>
                        <strong>Banco:</strong> ${p.bankName} | <strong>Ref:</strong> ${p.transactionRef}<br>
                        <span class="track-badge" style="${statusStyles[p.status]}">ESTADO: ${p.status.toUpperCase()}</span>
                    </div>
                    ${p.status === 'pendiente' ? `
                    <div class="admin-actions">
                        <button class="btn-table-action btn-success" onclick="window.resolvePayment(${p.id}, 'aceptado')">Aceptar</button>
                        <button class="btn-table-action btn-danger" onclick="window.resolvePayment(${p.id}, 'rechazado')">Rechazar</button>
                    </div>` : ''}
                </div>
            `).join('') : '<p>No hay pagos de suscripción pendientes.</p>';
        };

        window.resolvePayment = (paymentId, newStatus) => {
            const payments = getDB('mg_subscription_payments');
            const payment = payments.find(p => p.id === paymentId);
            if (!payment) return;

            payment.status = newStatus;
            if (newStatus === 'aceptado') {
                const users = getDB('mg_users');
                const user = users.find(u => u.email === payment.userEmail);
                if (user) user.role = 'cliente-p';
                saveDB('mg_users', users);
            }
            saveDB('mg_subscription_payments', payments);
            renderSubscriptionPayments();
            renderAdminUsers(); // Actualiza la lista de usuarios para ver el cambio de rol
        };

        // ================= CÁLCULOS E INSIGHTS FINANCIEROS (ADMIN) =================
        const renderAdminStats = () => {
            const listensEl = document.getElementById("admin-total-listens");
            if(!listensEl) return;
            
            const tracks = getDB('mg_tracks');
            const users = getDB('mg_users').filter(u => u.role !== 'administrador');
            const reservations = getDB('mg_reservations');

            const totalListens = tracks.reduce((sum, t) => sum + (t.plays || 0), 0);
            const streamingRevenue = totalListens * 0.005;
            
            const proUsersCount = users.filter(u => u.role === 'cliente-p').length;
            const subRevenue = proUsersCount * 8.00;

            const resRevenue = reservations.reduce((sum, r) => sum + (r.price || 0), 0);
            const totalRevenue = streamingRevenue + subRevenue + resRevenue;

            listensEl.innerText = totalListens.toLocaleString();
            document.getElementById("admin-total-revenue").innerText = `$${totalRevenue.toFixed(2)}`;
            document.getElementById("admin-total-users").innerText = users.length;
            document.getElementById("admin-sub-revenue") && (document.getElementById("admin-sub-revenue").innerText = `$${subRevenue.toFixed(2)}`);

            // Renderizar gráficas e informe para Admin
            renderAdminCharts(totalRevenue, streamingRevenue, subRevenue, resRevenue);
            renderAdminFinancialTable(streamingRevenue, subRevenue, resRevenue, totalListens, proUsersCount, reservations.length);
        };

        const renderAdminCharts = (totalRevenue, streamingRevenue, subRevenue, resRevenue) => {
            const ctxLine = document.getElementById('admin-financial-chart');
            const ctxDonut = document.getElementById('admin-sources-chart');
            if (!ctxLine || !ctxDonut || typeof Chart === 'undefined') return;

            const days = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
            const multipliers = [0.15, 0.25, 0.28, 0.32];
            const weeklyData = multipliers.map(m => (totalRevenue * m).toFixed(2));

            if (adminLineChart) adminLineChart.destroy();
            adminLineChart = new Chart(ctxLine, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Recaudación Semanal ($)',
                        data: weeklyData,
                        backgroundColor: '#3b82f6',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.08)' } },
                        x: { grid: { display: false } }
                    }
                }
            });

            if (adminDonutChart) adminDonutChart.destroy();
            adminDonutChart = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: ['Reproducciones', 'Suscripciones Pro', 'Reservas de Estudio'],
                    datasets: [{
                        data: [streamingRevenue.toFixed(2), subRevenue.toFixed(2), resRevenue.toFixed(2)],
                        backgroundColor: ['#22c55e', '#a855f7', '#3b82f6'],
                        borderWidth: 2,
                        borderColor: 'transparent'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }
                    }
                }
            });
        };

        const renderAdminFinancialTable = (streamingRev, subRev, resRev, listens, proUsers, resCount) => {
            const tableBody = document.getElementById('admin-financial-table-body');
            if (!tableBody) return;

            tableBody.innerHTML = `
                <tr>
                    <td><strong>Regalías por Streaming</strong></td>
                    <td>${listens.toLocaleString()} Escuchas</td>
                    <td>$0.005 / Play</td>
                    <td><strong style="color:#22c55e;">$${streamingRev.toFixed(2)}</strong></td>
                    <td><span class="track-badge" style="background:#22c55e; color:#fff;">Activo</span></td>
                </tr>
                <tr>
                    <td><strong>Suscripciones Pro</strong></td>
                    <td>${proUsers} Usuarios Pro</td>
                    <td>$8.00 / Mes</td>
                    <td><strong style="color:#a855f7;">$${subRev.toFixed(2)}</strong></td>
                    <td><span class="track-badge" style="background:#a855f7; color:#fff;">Recurrente</span></td>
                </tr>
                <tr>
                    <td><strong>Reservas de Estudio/Inst.</strong></td>
                    <td>${resCount} Reservas Registradas</td>
                    <td>Tarifas Variables</td>
                    <td><strong style="color:#3b82f6;">$${resRev.toFixed(2)}</strong></td>
                    <td><span class="track-badge" style="background:#3b82f6; color:#fff;">Procesado</span></td>
                </tr>
            `;
        };

        document.getElementById("add-service-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const items = getDB('mg_services_catalog');
            items.push({
                id: Date.now(), name: document.getElementById("sv-name").value, type: document.getElementById("sv-type").value,
                location: document.getElementById("sv-location").value, schedule: document.getElementById("sv-schedule").value,
                price: parseFloat(document.getElementById("sv-price").value), image: document.getElementById("sv-image").value
            });
            saveDB('mg_services_catalog', items); e.target.reset(); renderAdminServices();
        });
        window.delService = (id) => { saveDB('mg_services_catalog', getDB('mg_services_catalog').filter(i => i.id !== id)); renderAdminServices(); };

        renderAdminTracks(); renderAdminUsers(); renderAdminDelReqs(); renderAdminClaims(); renderAdminServices(); renderAdminReservations(); renderAdminStats(); renderSubscriptionPayments();
    }

    document.querySelectorAll(".logout-btn-text").forEach(btn => btn.addEventListener("click", () => {
        sessionStorage.removeItem('mg_current_user'); window.location.href = 'index.html';
    }));
});