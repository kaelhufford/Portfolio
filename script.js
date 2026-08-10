(function() {
	const container = document.getElementById('top-half');
	if (!container) return; 

	const canvas = document.createElement('canvas');
	canvas.id = 'schematic-canvas';
	canvas.style.position = 'absolute';
	canvas.style.top = '0';
	canvas.style.left = '0';
	canvas.style.zIndex = '1';
	canvas.style.cursor = 'crosshair';
	container.appendChild(canvas);

	const ctx = canvas.getContext('2d');

	let width, height;
	function resize() {
		width = canvas.width = container.clientWidth;
		height = canvas.height = container.clientHeight;
	}
	window.addEventListener('resize', resize);
	resize();

	let mouse = { x: -1000, y: -1000 };
	container.addEventListener('mousemove', (e) => {
		const rect = canvas.getBoundingClientRect();
		mouse.x = e.clientX - rect.left;
		mouse.y = e.clientY - rect.top;
	});

	container.addEventListener('mouseleave', () => {
		mouse.x = -1000;
		mouse.y = -1000;
	});

	// --- THEME PRESETS ---
	const themes = [
		{ name: 'CYBER_CYAN', hex: '#00f2ff', rgb: '0, 242, 255', archHex: '#00e5f2', archRgb: '0, 229, 242' },
		{ name: 'TERMINAL_GREEN', hex: '#00ff66', rgb: '0, 255, 102', archHex: '#00e65c', archRgb: '0, 230, 92' },
		{ name: 'FALLOUT_AMBER', hex: '#ffb000', rgb: '255, 176, 0', archHex: '#e69e00', archRgb: '230, 158, 0' },
		{ name: 'QUANTUM_VIOLET', hex: '#b000ff', rgb: '176, 0, 255', archHex: '#9e00e6', archRgb: '158, 0, 230' },
		{ name: 'OVERRIDE_RED', hex: '#ff3333', rgb: '255, 51, 51', archHex: '#e62e2e', archRgb: '230, 46, 46' }
	];
	let currentThemeIndex = 0;
	let glitchTimer = 0; 

	function applyTheme(index) {
		currentThemeIndex = index;
		const t = themes[currentThemeIndex];
		document.documentElement.style.setProperty('--accent', t.hex);
		glitchTimer = 15; 
	}

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const nextIndex = (currentThemeIndex + 1) % themes.length;
            applyTheme(nextIndex);
            themeBtn.innerText = `[ ${themes[nextIndex].name} ]`;
        });
    }

	// --- AUTO-GENERATE NODES FROM HTML & SCRAPE TAGS ---
	const nodes = [];
	const moduleBoxes = document.querySelectorAll('.module-box');
	
	moduleBoxes.forEach((box) => {
        const projectTags = Array.from(box.querySelectorAll('.tag')).map(t => t.innerText.trim().toUpperCase());

		nodes.push({
			id: box.id,
			label: box.getAttribute('data-label') || 'UNKNOWN_NODE',
			sub: box.getAttribute('data-sub') || 'UNKNOWN',
			rel: box.getAttribute('data-rel') || 'UNKNOWN',
			date: box.getAttribute('data-date') || '', 
			status: box.getAttribute('data-status') || 'archived', 
            summary: box.getAttribute('data-summary') || '', // New property scraped
            tags: projectTags,
			x: 0, y: 0, vx: 0, vy: 0 
		});
	});

    // --- IDLE SCREENSAVER LOGIC ---
    const idleFeed = document.getElementById('idle-feed');
    if (idleFeed) {
        // Generate the chronological items (nodes are scraped in chronological order already)
        nodes.forEach(n => {
            const el = document.createElement('div');
            el.className = 'idle-item';
            el.innerHTML = `
                <div class="idle-title">&gt; ${n.label}</div>
                <div class="idle-meta">${n.sub} // ${n.date}</div>
                <div class="idle-summary">${n.summary}</div>
            `;
            idleFeed.appendChild(el);
        });
    }

    let idleIndex = 0;
    let idleInterval;
    const idleItems = document.querySelectorAll('.idle-item');

    function cycleIdleFeed() {
        if (idleItems.length === 0) return;
        idleItems.forEach(item => item.classList.remove('visible'));
        idleItems[idleIndex].classList.add('visible');
        idleIndex = (idleIndex + 1) % idleItems.length;
    }

    function startIdleFeed() {
        if (!document.getElementById('default-state')) return;
        document.getElementById('default-state').style.display = 'flex';
        idleItems.forEach(item => item.classList.remove('visible'));
        idleIndex = 0;
        cycleIdleFeed();
        idleInterval = setInterval(cycleIdleFeed, 3500);
    }

    function stopIdleFeed() {
        if (!document.getElementById('default-state')) return;
        clearInterval(idleInterval);
        document.getElementById('default-state').style.display = 'none';
    }

    // --- TAG FILTERING LOGIC ---
    let activeFilter = null;
    const filterButtons = document.querySelectorAll('.filter-tag');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterValue = e.target.getAttribute('data-filter');
            
            if (activeFilter === filterValue) {
                activeFilter = null;
                e.target.classList.remove('active');
            } else {
                filterButtons.forEach(t => t.classList.remove('active'));
                activeFilter = filterValue;
                e.target.classList.add('active');
            }

            moduleBoxes.forEach(box => {
                let tags = Array.from(box.querySelectorAll('.tag')).map(t => t.innerText.trim().toUpperCase());
                
                if (activeFilter && !tags.includes(activeFilter)) {
                    box.classList.add('filtered-out');
                    box.classList.remove('active');
                } else {
                    box.classList.remove('filtered-out');
                }
            });

            if (window.innerWidth >= 1024) {
                const anyActive = document.querySelector('.module-box.active');
                if (!anyActive) {
                    startIdleFeed(); 
                }
            }
        });
    });

	function getBounds() {
		const margin = 40; 
		return {
			x: margin,
			y: margin,
			w: width - (margin * 2),
			h: height - (margin * 2)
		};
	}

	function initNodes() {
		const b = getBounds();
		const centerX = b.x + b.w / 2;
		const centerY = b.y + b.h / 2;
		
		const radius = Math.min(b.w, b.h) * 0.35; 

		nodes.forEach((n, i) => {
			const angle = (i / nodes.length) * Math.PI * 2;
			
			n.x = centerX + Math.cos(angle) * radius;
			n.y = centerY + Math.sin(angle) * radius;

			n.ox = n.x;
			n.oy = n.y;
			n.vx = (Math.random() - 0.5) * 0.3; 
			n.vy = (Math.random() - 0.5) * 0.3;
		});

        startIdleFeed(); 
	}
	initNodes();

	window.addEventListener('resize', () => {
		resize();
		initNodes();
	});

	canvas.addEventListener('click', (e) => {
		const rect = canvas.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const clickY = e.clientY - rect.top;

		nodes.forEach(n => {
			let dx = clickX - n.x;
			let dy = clickY - n.y;
			let dist = Math.sqrt(dx * dx + dy * dy);
            
            const isFaded = activeFilter && !n.tags.includes(activeFilter);

			if (dist < 30 && !isFaded) {
                stopIdleFeed(); 
                
                const modules = document.querySelectorAll('.module-box');
                modules.forEach(mod => mod.classList.remove('active'));

                const targetMod = document.getElementById(n.id);
                if (targetMod) {
                    targetMod.classList.add('active');
                    document.getElementById('bottom-half').scrollTop = 0;
                }
			}
		});
	});

	function animate() {
		const t = themes[currentThemeIndex];
		const rgb = t.rgb;
        const archRgb = t.archRgb;

		ctx.fillStyle = '#050505';
		ctx.fillRect(0, 0, width, height);

		if (glitchTimer > 0) {
			glitchTimer--;
			ctx.fillStyle = `rgba(${rgb}, 0.08)`;
			ctx.fillRect(0, 0, width, height);
			for(let g = 0; g < 3; g++) {
				let gx = Math.random() * width;
				let gy = Math.random() * height;
				ctx.fillStyle = `rgba(${rgb}, 0.25)`;
				ctx.fillRect(0, gy, width, Math.random() * 6);
			}
		}

		const b = getBounds();

		// contained container frame
		ctx.strokeStyle = `rgba(${rgb}, 0.15)`;
		ctx.lineWidth = 1;
		ctx.strokeRect(b.x, b.y, b.w, b.h);

		// corner accents
		const cornerLen = 15;
		ctx.strokeStyle = `rgba(${rgb}, 0.5)`;
		ctx.lineWidth = 2;
		ctx.beginPath(); ctx.moveTo(b.x, b.y + cornerLen); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + cornerLen, b.y); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(b.x + b.w - cornerLen, b.y); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w, b.y + cornerLen); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h - cornerLen); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + cornerLen, b.y + b.h); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(b.x + b.w - cornerLen, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h - cornerLen); ctx.stroke();

		// contained grid lines
		ctx.strokeStyle = `rgba(${rgb}, 0.04)`;
		ctx.lineWidth = 1;
		const gridSize = 40;
		for (let x = b.x; x < b.x + b.w; x += gridSize) {
			ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke();
		}
		for (let y = b.y; y < b.y + b.h; y += gridSize) {
			ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke();
		}

        // --- HARD ELASTIC COLLISIONS ---
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                let dx = nodes[i].x - nodes[j].x;
                let dy = nodes[i].y - nodes[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                
                let minDist = 130; 
                
                if (dist < minDist && dist > 0) {
                    let overlap = minDist - dist;
                    let nx = dx / dist;
                    let ny = dy / dist;

                    nodes[i].x += (nx * overlap) / 2;
                    nodes[i].y += (ny * overlap) / 2;
                    nodes[j].x -= (nx * overlap) / 2;
                    nodes[j].y -= (ny * overlap) / 2;

                    let kx = (nodes[i].vx - nodes[j].vx);
                    let ky = (nodes[i].vy - nodes[j].vy);
                    let p = (nx * kx + ny * ky); 

                    nodes[i].vx -= p * nx;
                    nodes[i].vy -= p * ny;
                    nodes[j].vx += p * nx;
                    nodes[j].vy += p * ny;
                }
            }
        }

        // --- NODE MOVEMENT & BOUNDARY COLLISION ---
		nodes.forEach(n => {
            const maxSpeed = 0.25;
            let speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
            if (speed > maxSpeed) {
                n.vx = (n.vx / speed) * maxSpeed;
                n.vy = (n.vy / speed) * maxSpeed;
            }

			n.x += n.vx;
			n.y += n.vy;

			if (n.x < b.x + 30) { n.x = b.x + 30; n.vx *= -1; }
			if (n.x > b.x + b.w - 180) { n.x = b.x + b.w - 180; n.vx *= -1; }
			if (n.y < b.y + 30) { n.y = b.y + 30; n.vy *= -1; }
			if (n.y > b.y + b.h - 30) { n.y = b.y + b.h - 30; n.vy *= -1; }
		});

		// node connections
		ctx.lineWidth = 1;
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				let dx = nodes[i].x - nodes[j].x;
				let dy = nodes[i].y - nodes[j].y;
				let dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < 250) {
                    let faded1 = activeFilter && !nodes[i].tags.includes(activeFilter);
                    let faded2 = activeFilter && !nodes[j].tags.includes(activeFilter);

                    if (faded1 && faded2) {
                        ctx.strokeStyle = `rgba(31, 41, 55, ${0.1 * (1 - dist / 250)})`;
                    } else if (faded1 || faded2) {
                        ctx.strokeStyle = `rgba(${rgb}, ${0.1 * (1 - dist / 250)})`;
                    } else {
                        let connColor = (nodes[i].status === 'active' || nodes[j].status === 'active') ? rgb : archRgb;
                        ctx.strokeStyle = `rgba(${connColor}, ${0.25 * (1 - dist / 250)})`;
                    }
                    
					ctx.beginPath();
					ctx.moveTo(nodes[i].x, nodes[i].y);
					ctx.lineTo(nodes[j].x, nodes[j].y);
					ctx.stroke();
				}
			}
		}

		let hoveredNode = false;

		nodes.forEach(n => {
			let dx = mouse.x - n.x;
			let dy = mouse.y - n.y;
			let dist = Math.sqrt(dx * dx + dy * dy);
            
            const isFaded = activeFilter && !n.tags.includes(activeFilter);

            let nodeRgb = n.status === 'active' ? rgb : archRgb;
			let hexColor = n.status === 'active' ? t.hex : t.archHex;

            if (isFaded) {
                nodeRgb = '31, 41, 55';
                hexColor = '#1f2937';
            }

			if (dist < 30 && !isFaded) hoveredNode = true;

			if (dist < 150 && !isFaded) {
				ctx.strokeStyle = `rgba(${nodeRgb}, ${0.7 * (1 - dist / 150)})`;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(mouse.x, mouse.y);
				ctx.lineTo(n.x, n.y);
				ctx.stroke();

				ctx.strokeStyle = `rgba(${nodeRgb}, 0.5)`;
				ctx.beginPath();
				ctx.arc(n.x, n.y, 10 + (Math.sin(Date.now() * 0.01) * 3), 0, Math.PI * 2);
				ctx.stroke();
			}

			// Render dots
			ctx.fillStyle = hexColor;
			ctx.beginPath();
			ctx.arc(n.x, n.y, 4, 0, Math.PI * 2); 
			ctx.fill();

			const labelText = `[${n.label}]`;
			const subText = n.sub;
			const dateText = n.date ? n.date : '';

			// Text assignments 
			let textX = n.x + 16;
			let textY = n.y - 4;
			
			if (textY - 15 < 0) {
				textY = 20;
			} else if (textY + 40 > height) {
				textY = height - 45;
			}

            const textOpacityMod = isFaded ? 0.3 : 0.85;

			// Render node name 
			ctx.font = 'bold 14px "Courier New", monospace';
			ctx.fillStyle = `rgba(${nodeRgb}, ${textOpacityMod})`;
			ctx.fillText(labelText, textX, textY);
			
			// Render sub-text 
			ctx.font = '11px "Courier New", monospace';
			ctx.fillStyle = `rgba(${nodeRgb}, ${textOpacityMod - 0.35})`;
			ctx.fillText(subText, textX, textY + 14);

			// Render dates
			if (dateText) {
				ctx.fillStyle = `rgba(255, 255, 255, ${isFaded ? 0.1 : 0.5})`;
				ctx.fillText(dateText, textX, textY + 28);
			}
		});

		canvas.style.cursor = hoveredNode ? 'pointer' : 'crosshair';

		if (mouse.x > 0 && mouse.x < width && mouse.y > 0 && mouse.y < height) {
			ctx.strokeStyle = `rgba(${rgb}, 0.5)`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(mouse.x, mouse.y, 16, 0, Math.PI * 2);
			ctx.moveTo(mouse.x - 22, mouse.y); ctx.lineTo(mouse.x + 22, mouse.y);
			ctx.moveTo(mouse.x, mouse.y - 22); ctx.lineTo(mouse.x, mouse.y + 22);
			ctx.stroke();
		}

		requestAnimationFrame(animate);
	}

	animate();
})();