document.addEventListener("DOMContentLoaded", () => {
    AOS.init({ duration: 1200, once: true });

    const menuOverlay = document.getElementById("menuOverlay");

    // --- SWAL THEME HELPER (reads live CSS variables so alerts match dark/light mode) ---
    function swalColors() {
        const styles = getComputedStyle(document.documentElement);
        return {
            background: styles.getPropertyValue('--bg-inner').trim() || '#10131c',
            color: styles.getPropertyValue('--text').trim() || '#f1f2f6'
        };
    }

    // --- DARK / LIGHT MODE ---
    const themeToggleBtn = document.getElementById("themeToggle");
    const savedTheme = localStorage.getItem("theme") ||
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }

    applyTheme(savedTheme);

    themeToggleBtn.onclick = () => {
        const current = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(current);
    };

    // --- SIDEBAR LOGIC ---
    document.getElementById("openMenu").onclick = () => { menuOverlay.style.display = "block"; };
    document.getElementById("closeMenu").onclick = () => { menuOverlay.style.display = "none"; };
    document.querySelectorAll(".menu-link").forEach(link => {
        link.addEventListener("click", () => { menuOverlay.style.display = "none"; });
    });

    // --- FIREBASE AUTH LOGIC ---
    window.login = () => {
        const email = document.getElementById("user").value;
        const pass = document.getElementById("pass").value;

        api.signInWithEmailAndPassword(auth, email, pass)
            .then(() => {
                Swal.fire({ title: 'GRANTED', text: 'Welcome Admin', icon: 'success', ...swalColors() });
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            })
            .catch(() => Swal.fire({ title: 'DENIED', text: 'Wrong Credential', icon: 'error', ...swalColors() }));
    };

    window.logout = () => {
        api.signOut(auth).then(() => location.reload());
    };

    api.onAuthStateChanged(auth, (user) => {
        const isLog = !!user;
        document.getElementById("sidebarLoginBtn").classList.toggle("d-none", isLog);
        document.getElementById("sidebarLogoutBtn").classList.toggle("d-none", !isLog);
        document.getElementById("fastAddBtn").classList.toggle("d-none", !isLog);
        document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("d-none", !isLog));
        
        syncData(isLog);
    });

    // --- DATABASE SYNC ---
    function syncData(isLog) {
        const qProj = api.query(api.collection(db, "projects"), api.orderBy("createdAt", "desc"));
        api.onSnapshot(qProj, (snap) => {
            const data = snap.docs.map(d => ({ fsId: d.id, ...d.data() }));
            renderProjects(data, isLog);
        });

        const qCert = api.query(api.collection(db, "certificates"), api.orderBy("createdAt", "desc"));
        api.onSnapshot(qCert, (snap) => {
            const data = snap.docs.map(d => ({ fsId: d.id, ...d.data() }));
            renderCerts(data, isLog);
        });
    }

    // --- CRUD FUNCTIONS ---
    let editingProjectId = null;
    let editingCertId = null;

    window.saveProject = async () => {
        const title = document.getElementById("pTitle").value.trim();
        const category = document.getElementById("pCat").value.trim();
        const image = document.getElementById("pImg").value.trim();
        const description = document.getElementById("pDesc").value.trim();

        if (!title) {
            Swal.fire({ title: 'INCOMPLETE', text: 'Title wajib diisi', icon: 'warning', ...swalColors() });
            return;
        }

        const data = { title, category, image, description };

        try {
            if (editingProjectId) {
                await api.updateDoc(api.doc(db, "projects", editingProjectId), data);
                Swal.fire({ title: 'UPDATED', text: 'Project berhasil diperbarui', icon: 'success', ...swalColors() });
            } else {
                data.createdAt = Date.now();
                await api.addDoc(api.collection(db, "projects"), data);
                Swal.fire({ title: 'SAVED', text: 'Project berhasil ditambahkan', icon: 'success', ...swalColors() });
            }
            bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide();
            resetProjectForm();
        } catch (err) {
            Swal.fire({ title: 'ERROR', text: 'Gagal menyimpan project', icon: 'error', ...swalColors() });
        }
    };

    window.editProj = (fsId, p) => {
        editingProjectId = fsId;
        document.getElementById("pTitle").value = p.title || "";
        document.getElementById("pCat").value = p.category || "";
        document.getElementById("pImg").value = p.image || "";
        document.getElementById("pDesc").value = p.description || "";
        document.getElementById("crudModalTitle").innerText = "EDIT PROJECT";
        document.getElementById("crudSaveBtn").innerText = "UPDATE CLOUD";
        bootstrap.Modal.getOrCreateInstance(document.getElementById('crudModal')).show();
    };

    function resetProjectForm() {
        editingProjectId = null;
        ['pTitle', 'pCat', 'pImg', 'pDesc'].forEach(id => document.getElementById(id).value = "");
        document.getElementById("crudModalTitle").innerText = "ADD PROJECT";
        document.getElementById("crudSaveBtn").innerText = "SAVE TO CLOUD";
    }

    document.getElementById('crudModal').addEventListener('hidden.bs.modal', resetProjectForm);

    window.saveCertificate = async () => {
        const title = document.getElementById("certTitle").value.trim();
        const image = document.getElementById("certImg").value.trim();

        if (!title) {
            Swal.fire({ title: 'INCOMPLETE', text: 'Nama sertifikat wajib diisi', icon: 'warning', ...swalColors() });
            return;
        }

        const data = { title, image };

        try {
            if (editingCertId) {
                await api.updateDoc(api.doc(db, "certificates", editingCertId), data);
                Swal.fire({ title: 'UPDATED', text: 'Sertifikat berhasil diperbarui', icon: 'success', ...swalColors() });
            } else {
                data.createdAt = Date.now();
                await api.addDoc(api.collection(db, "certificates"), data);
                Swal.fire({ title: 'SAVED', text: 'Sertifikat berhasil ditambahkan', icon: 'success', ...swalColors() });
            }
            bootstrap.Modal.getInstance(document.getElementById('certModal')).hide();
            resetCertForm();
        } catch (err) {
            Swal.fire({ title: 'ERROR', text: 'Gagal menyimpan sertifikat', icon: 'error', ...swalColors() });
        }
    };

    window.editCert = (fsId, c) => {
        editingCertId = fsId;
        document.getElementById("certTitle").value = c.title || "";
        document.getElementById("certImg").value = c.image || "";
        document.getElementById("certModalTitle").innerText = "EDIT CERTIFICATE";
        document.getElementById("certSaveBtn").innerText = "UPDATE CLOUD";
        bootstrap.Modal.getOrCreateInstance(document.getElementById('certModal')).show();
    };

    function resetCertForm() {
        editingCertId = null;
        ['certTitle', 'certImg'].forEach(id => document.getElementById(id).value = "");
        document.getElementById("certModalTitle").innerText = "ADD CERTIFICATE";
        document.getElementById("certSaveBtn").innerText = "SAVE TO CLOUD";
    }

    document.getElementById('certModal').addEventListener('hidden.bs.modal', resetCertForm);

    window.delProj = (fsId) => {
        if(confirm("Hapus Project ini?")) api.deleteDoc(api.doc(db, "projects", fsId));
    };

    window.delCert = (fsId) => {
        if(confirm("Hapus Sertifikat ini?")) api.deleteDoc(api.doc(db, "certificates", fsId));
    };

    // --- RENDER FUNCTIONS (WITH IMAGE ERROR HANDLING) ---
    const projectsById = {};
    const certsById = {};

    function escapeHtml(str) {
        return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function renderProjects(data, isLog) {
        const pContainer = document.getElementById("projects-container");
        if(!pContainer) return;
        pContainer.innerHTML = "";
        data.forEach(p => {
            projectsById[p.fsId] = p;
            const div = document.createElement("div");
            div.className = "col-md-4 mb-4";
            div.setAttribute("data-aos", "fade-up");
            div.innerHTML = `
                <div class="work-card">
                    <div class="work-img-wrapper">
                        <img src="${escapeHtml(p.image)}" 
                             class="work-img" 
                             onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600';">
                    </div>
                    <div class="d-flex justify-content-between mt-2 align-items-start">
                        <div><h5 class="work-title">${escapeHtml(p.title)}</h5><span class="work-cat">${escapeHtml(p.category)}</span></div>
                        ${isLog ? `<div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-light" onclick="editProj('${p.fsId}', projectsById['${p.fsId}'])">EDIT</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="delProj('${p.fsId}')">DEL</button>
                        </div>` : ''}
                    </div>
                </div>`;
            pContainer.appendChild(div);
        });
    }

    function renderCerts(data, isLog) {
        const cContainer = document.getElementById("cert-container");
        if(!cContainer) return;
        cContainer.innerHTML = "";
        data.forEach(c => {
            certsById[c.fsId] = c;
            const div = document.createElement("div");
            div.className = "col-md-4 col-6 mb-4";
            div.setAttribute("data-aos", "fade-up");
            div.innerHTML = `
                <div class="cert-card">
                    <img src="${escapeHtml(c.image)}" 
                         class="cert-img" 
                         onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/2912/2912761.png';">
                    <p class="cert-title mt-2">${escapeHtml(c.title)}</p>
                    ${isLog ? `<div class="d-flex gap-1">
                        <button class="btn btn-xs btn-outline-light w-50" style="font-size:8px" onclick="editCert('${c.fsId}', certsById['${c.fsId}'])">EDIT</button>
                        <button class="btn btn-xs btn-danger w-50" style="font-size:8px" onclick="delCert('${c.fsId}')">DELETE</button>
                    </div>` : ''}
                </div>`;
            cContainer.appendChild(div);
        });
    }

    window.projectsById = projectsById;
    window.certsById = certsById;

    // --- CONTACT FORM ---
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            btn.innerText = 'SENDING...'; btn.disabled = true;
            try {
                const res = await fetch(contactForm.action, { method: 'POST', body: new FormData(contactForm), headers: { 'Accept': 'application/json' } });
                if (res.ok) { 
                    Swal.fire({ title: 'SENT', text: 'Tegar will reply soon!', icon: 'success', ...swalColors() });
                    contactForm.reset();
                }
            } catch (err) { Swal.fire({ title: 'ERROR', icon: 'error', ...swalColors() }); }
            btn.innerText = 'SEND MESSAGE'; btn.disabled = false;
        };
    }
});