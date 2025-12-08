/**
 * Sistema de Gestão Hospitalar Simplificado (SGHSS) - Demo
 * @author Andressa Bruna Gobbi
 */

// Estado global da aplicação, simulando um backend
const appState = {
  // Lista de pacientes iniciais
  patients: [
    {id:1,name:'João Silva',age:42,contact:'(48) 99123-4567',last:'2025-11-27',history:['Hipertensão']},
    {id:2,name:'Mariana Costa',age:29,contact:'(48) 99876-5544',last:'2025-11-29',history:['Alergia a penicilina']},
    {id:3,name:'Carlos Souza',age:63,contact:'(48) 98811-2233',last:'2025-11-20',history:['Diabetes tipo 2']}
  ],
  // Profissionais de saúde
  professionals:[
    {id:1,name:'Dr. Ana Pereira',role:'Médica',specialty:'Cardiologia'},
    {id:2,name:'Enf. Bruno Lima',role:'Enfermeiro',specialty:'Urgência'},
    {id:3,name:'Dr. Felipe Rocha',role:'Médico',specialty:'Telemedicina'} // ID 3 reservado para telemedicina
  ],
  appointments:[], // Agendamentos (persistidos localmente)
  beds:{total:120,occupied:34},
  supplies:{critical:4}
}

// Utils para querySelector (padrão de projeto) --------------------------------
const $ = (sel,root=document) => root.querySelector(sel)
const $$ = (sel,root=document) => Array.from(root.querySelectorAll(sel))

const STORAGE_KEY = 'sghss_demo_v2_v1' // versãod de storage (mude se precisar reset)

// --------------------------- Persistência (localStorage) ---------------------
/** Carrega o estado do localStorage (appointments + professionals) */
function loadStateFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(raw){
      const parsed = JSON.parse(raw)
      // Carrega somente chaves suportadas, mantendo defaults caso não existam
      if(parsed.appointments) appState.appointments = parsed.appointments
      if(parsed.professionals) {
        // Garantia: não substituir profissionais se vazio (mas sobrescrever normalmente)
        appState.professionals = parsed.professionals
      }
      if(parsed.patients) {
        // opcional: permite persistir pacientes também no futuro
        appState.patients = parsed.patients
      }
    }
  }catch(e){
    console.error("Falha ao carregar estado do storage:", e)
  }
}

/** Salva o estado atual (appointments + professionals + optional patients) no localStorage. */
function persist(){
  try{
    const payload = {
      appointments: appState.appointments,
      professionals: appState.professionals,
      patients: appState.patients
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }catch(e){
    console.warn("Falha ao persistir dados.", e)
  }
}
// Listener para persistência antes do fechamento
window.addEventListener('beforeunload',persist)

// --------------------------- Navegação entre seções --------------------------
$$('.navitem').forEach(el=>el.addEventListener('click',()=>{
  // Limpa o estado 'ativo' anterior
  $$('.navitem').forEach(i=>i.removeAttribute('aria-current'))
  el.setAttribute('aria-current','page')
  const section = el.dataset.section
  showSection(section)
}))

/** Exibe a seção de conteúdo solicitada e oculta as demais. */
function showSection(name){
  $$('[data-section-content]').forEach(s=>{
    s.hidden = (s.dataset.sectionContent !== name)
  })
  // Foca no workspace para acessibilidade
  $('#workspace')?.focus()
}

// --------------------------- Estatísticas / Dashboard -----------------------
/** Normaliza texto removendo diacríticos e convertendo para lower-case */
function normalizeText(s){
  if(!s) return ''
  // Remove acentos usando NFD + regex (suporta caracteres Unicode)
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Renderiza os dados estatísticos no Dashboard. */
function renderStats(){
  // Stats do topo (cards)
  $('#statPatients').textContent = appState.patients.length
  // Valor randômico simulado
  $('#newPatientsWeek').textContent = Math.max(0, Math.floor(Math.random()*6))
  $('#statAppointments').textContent = appState.appointments.length

  $('#bedOccupancy').textContent = appState.beds.occupied + ' / ' + appState.beds.total
  $('#criticalSupplies').textContent = appState.supplies.critical

  // Stats da seção Profissionais (agora com normalização para detectar "med", "enf")
  const isMed = p => normalizeText(p.role).includes('med') || normalizeText(p.role).includes('méd') || normalizeText(p.role).includes('dr') || normalizeText(p.role).includes('médico') || normalizeText(p.role).includes('medica') || normalizeText(p.role).includes('médica')
  const isEnf = p => normalizeText(p.role).includes('enf') || normalizeText(p.role).includes('enfer')

  const docs = appState.professionals.filter(isMed)
  const nurses = appState.professionals.filter(isEnf)

  $('#countDocs').textContent = docs.length
  $('#countNurses').textContent = nurses.length
  $('#countTechs').textContent = appState.professionals.length - (docs.length + nurses.length)

  // Stats da seção Administração
  $('#leitosStat').textContent = appState.beds.occupied + ' ocupados'
  $('#reservasStat').textContent = Math.floor(Math.random()*12) + ' reservas'
  $('#financeStat').textContent = 'R$ ' + (Math.floor(Math.random()*500000)/100).toLocaleString('pt-BR', {minimumFractionDigits: 2})

  renderTeleAppointments()
}

// --------------------------- Pacientes -------------------------------------
/** Renderiza a lista de pacientes com base no filtro. */
function renderPatients(filter=''){
  const tbody = $('#patientsTable')
  if(!tbody) return // Early exit se a tabela não existe
  tbody.innerHTML=''

  const lowerFilter = (filter || '').toLowerCase()
  // Filtra por nome ou contato
  const filteredRows = appState.patients.filter(p=>
    p.name.toLowerCase().includes(lowerFilter) || (p.contact||'').includes(lowerFilter)
  )

  filteredRows.forEach(p=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${p.name}</td><td>${p.age}</td><td class="small muted">${p.contact}</td><td class="small muted">${p.last}</td><td><button data-id="${p.id}" class="openPatient">Abrir</button></td>`
    tbody.appendChild(tr)
  })

  // Adiciona listeners para abrir o modal de paciente
  $$('.openPatient').forEach(b=>b.addEventListener('click',e=>openPatient(Number(e.target.dataset.id))))
}

// Paciente e agendamento ------------------------------------------
/** Abre o modal de visualização de paciente. */
function openPatient(id){
  const patient = appState.patients.find(x=>x.id===id)
  if(!patient) return alert('Erro: Paciente não encontrado (ID:'+id+')') // Fail-safe

  const content = `<h3>Paciente — ${escapeHtml(patient.name)}</h3>
    <div class="form-row">
      <div class="field"><label>Idade</label><div>${escapeHtml(String(patient.age))}</div></div>
      <div class="field"><label>Contato</label><div>${escapeHtml(patient.contact || '')}</div></div>
    </div>
    <div style="margin-top:10px">
      <label>Histórico clínico</label>
      <textarea readonly>${escapeHtml((patient.history||[]).join('\n'))}</textarea>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button onclick="scheduleFor(${patient.id})">Agendar consulta</button>
      <button class="ghost" onclick="closeModal()">Fechar</button>
    </div>`
  
  showModal(content,{width:'640px'})
}

// --------------------------- Modal Genérico ------------------------------
/** Exibe o modal global com o conteúdo fornecido. */
function showModal(content,opts={}){
  const root = $('#modalRoot')
  if(!root) return
  root.innerHTML = '' // Limpa conteúdo anterior

  const backdrop = document.createElement('div')
  backdrop.className='modal-backdrop'
  backdrop.tabIndex = -1 // Torna focável para listeners

  const modal = document.createElement('div')
  modal.className='modal'
  modal.style.maxWidth = opts.width || '500px' // Aplica largura opcional
  modal.innerHTML = `<div class="top"><div class="small muted">Modal</div><button aria-label="Fechar" id="closeModalBtn">✕</button></div><div style="margin-top:12px">${content}</div>`

  backdrop.appendChild(modal)
  root.appendChild(backdrop)
  root.setAttribute('aria-hidden','false')

  // Adiciona listeners para fechar
  modal.querySelector('#closeModalBtn')?.addEventListener('click',closeModal)
  backdrop.addEventListener('click',e=>{if(e.target===backdrop) closeModal()})
}

/** Fecha o modal global. */
function closeModal(){
  const root = $('#modalRoot')
  if(!root) return
  root.innerHTML=''
  root.setAttribute('aria-hidden','true')
}

/** Redireciona para agendamento (seção profissionais) pré-preenchendo o paciente. */
function scheduleFor(patientId){
  closeModal()
  showSection('profissionais')
  // Pré-seleciona paciente e data atual (se os campos existirem)
  if($('#schPatient')) $('#schPatient').value = patientId
  if($('#schDate')) $('#schDate').value = new Date().toISOString().slice(0,10)
}

// --------------------------- Agendamento rápido (profissionais) -----------
if($('#quickSchedule')){
  $('#quickSchedule').addEventListener('submit',e=>{
    e.preventDefault()
    
    // Captura valores do formulário
    const patientId = Number($('#schPatient').value)
    const profId = Number($('#schProfessional').value)
    const date = $('#schDate').value
    const time = $('#schTime').value

    if(!patientId || !profId || !date || !time) return alert('ERRO: Preencha todos os campos obrigatórios.')

    // Cria e insere o novo agendamento
    appState.appointments.push({id:Date.now(),patient:patientId,prof:profId,date,time})
    
    alert(`Consulta agendada com sucesso: ${date} ${time}`)
    persist()
    renderStats() // Atualiza o dashboard
  })
}

// --------------------------- Populadores e filtros de UI --------------------
/** Preenche os <select>s de paciente e profissional. */
function populateSelects(){
  const pSel = $('#schPatient')
  const profSel = $('#schProfessional')

  // Popula o select de Pacientes
  if(pSel){
    pSel.innerHTML = '<option value="">— selecione —</option>'
    appState.patients.forEach(p=>{pSel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} — ${escapeHtml(p.contact||'')}</option>`})
  }

  // Popula o select de Profissionais
  if(profSel){
    profSel.innerHTML = '<option value="">— selecione —</option>'
    appState.professionals.forEach(p=>{profSel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} — ${escapeHtml(p.specialty||'')}</option>`})
  }

  // Listener para filtro na seção Pacientes
  $('#filterPatient')?.addEventListener('input',e=>renderPatients(e.target.value))

  // Listener para busca global (redireciona para Pacientes)
  $('#globalSearch')?.addEventListener('input',e=>{
    const searchVal = e.target.value.trim()
    if(searchVal.length>2){
      showSection('pacientes')
      renderPatients(searchVal)
    } else if(searchVal.length===0){
      showSection('dashboard') // Volta para o dashboard se o campo for limpo
    }
  })
}

// --------------------------- Cadastro de novo paciente ---------------------
$('#newPatientBtn')?.addEventListener('click',()=>openNewPatient())
$('#addPatient')?.addEventListener('click',()=>openNewPatient())

/** Abre o modal de cadastro de novo paciente. */
function openNewPatient(){
  showModal(`<h3>Novo Paciente</h3>
    <form id="formNewPatient">
      <div class="form-row">
        <div class="field"><label>Nome</label><input name="name" required></div>
        <div class="field"><label>Idade</label><input name="age" type="number" required></div>
      </div>
      <div style="margin-top:8px"><label>Contato</label><input name="contact"></div>
      <div style="margin-top:8px"><label>Observações/Histórico</label><textarea name="notes"></textarea></div>
      <div style="margin-top:12px">
        <button type="submit">Salvar</button> 
        <button type="button" class="ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `)

  // Handler para submissão do formulário de novo paciente
  $('#formNewPatient')?.addEventListener('submit',function(ev){
    ev.preventDefault()
    const formData = new FormData(ev.target)

    const name = formData.get('name')
    const age = Number(formData.get('age'))
    const contact = formData.get('contact')
    const notes = formData.get('notes')
    const id = Date.now() // ID baseado em timestamp (simples)

    // Adiciona o novo paciente ao estado
    appState.patients.push({
      id,
      name,
      age,
      contact,
      last: new Date().toISOString().slice(0,10), // Data de cadastro como última visita
      history: notes ? [notes] : []
    })

    closeModal()
    renderPatients()
    populateSelects() // Atualiza os selects de agendamento
    renderStats()
    persist()
    alert(`Novo paciente ${name} cadastrado com sucesso.`)
  })
}

// --------------------------- PROFISSIONAIS (NOVO MÓDULO) --------------------

/** Renderiza a lista de profissionais na tabela #professionalsList */
function renderProfessionals(){
  const tbody = $('#professionalsList')
  if(!tbody) return
  tbody.innerHTML = ''

  appState.professionals.forEach(p=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.role)}</td>
      <td>${escapeHtml(p.specialty || '')}</td>
      <td class="small muted">${escapeHtml(p.contact || '')}</td>
      <td>
        <button class="ghost editProf" data-id="${p.id}" title="Editar">Editar</button>
        <button class="ghost removeProf" data-id="${p.id}" title="Excluir">Excluir</button>
      </td>
    `
    tbody.appendChild(tr)
  })

  // listeners para excluir profissional (delegação simples)
  $$('.removeProf').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.target.dataset.id)
      removeProfessional(id)
    })
  })

  // listeners para edição (opcional: abre modal simples)
  $$('.editProf').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.target.dataset.id)
      openEditProfessional(id)
    })
  })
}

/** Remove um profissional pelo ID */
function removeProfessional(id){
  if(!confirm('Deseja realmente excluir este profissional?')) return
  const initialLen = appState.professionals.length
  appState.professionals = appState.professionals.filter(p => p.id !== id)
  if(appState.professionals.length === initialLen){
    return alert('Erro: Profissional não encontrado.')
  }
  renderProfessionals()
  populateSelects()
  renderStats()
  persist()
  alert('Profissional removido com sucesso.')
}

/** Abre modal de edição para um profissional (simples) */
function openEditProfessional(id){
  const p = appState.professionals.find(x=>x.id===id)
  if(!p) return alert('Profissional não encontrado.')

  showModal(`
    <h3>Editar Profissional</h3>
    <form id="formEditProfessional">
      <div class="form-row">
        <div class="field">
          <label>Nome</label>
          <input name="name" value="${escapeHtml(p.name)}" required>
        </div>
        <div class="field">
          <label>Função</label>
          <input name="role" value="${escapeHtml(p.role)}" required>
        </div>
      </div>
      <div style="margin-top:8px">
        <label>Especialidade</label>
        <input name="specialty" value="${escapeHtml(p.specialty||'')}" required>
      </div>
      <div style="margin-top:8px">
        <label>Contato</label>
        <input name="contact" value="${escapeHtml(p.contact||'')}">
      </div>
      <div style="margin-top:12px">
        <button type="submit">Salvar</button>
        <button type="button" class="ghost" onclick="closeModal()">Cancelar</button>
      </div>
    </form>
  `)

  $('#formEditProfessional')?.addEventListener('submit', function(ev){
    ev.preventDefault()
    const fd = new FormData(ev.target)
    p.name = fd.get('name')
    p.role = fd.get('role')
    p.specialty = fd.get('specialty')
    p.contact = fd.get('contact')

    closeModal()
    renderProfessionals()
    populateSelects()
    renderStats()
    persist()
    alert('Dados do profissional atualizados.')
  })
}

/** Handler para o formulário já existente no HTML (#formNewProfessional) */
$('#formNewProfessional')?.addEventListener('submit', function(ev){
  ev.preventDefault()
  // Captura campos pelo ID (conforme HTML que você forneceu)
  const name = ($('#profName')?.value || '').trim()
  const role = ($('#profRole')?.value || '').trim()
  const specialty = ($('#profSpecialty')?.value || '').trim()
  const contact = ($('#profContact')?.value || '').trim()

  if(!name || !role){
    return alert('ERRO: Preencha pelo menos Nome e Função do profissional.')
  }

  // Cria novo profissional
  const newProf = {
    id: Date.now(),
    name,
    role,
    specialty,
    contact
  }

  appState.professionals.push(newProf)
  // Atualiza UI e persistência
  renderProfessionals()
  populateSelects()
  renderStats()
  persist()

  // Limpa o formulário (mantendo a UX)
  try{
    ev.target.reset()
  }catch(e){ /* ignore */ }

  alert(`Profissional ${name} cadastrado com sucesso.`)
})

// --------------------------- Inicialização da aplicação ---------------------
function init(){
  loadStateFromStorage()
  renderStats()
  renderPatients()
  renderProfessionals() // -> agora renderiza a lista de profissionais ao iniciar
  populateSelects()
  populateTeleTimes()
  showSection('dashboard') // Seção inicial

  // fallback/listener ad-hoc (caso precise)
  // $('#filterPatient')?.addEventListener('input',e=>renderPatients(e.target.value))
}

// --------------------------- Teleconsulta (vídeo) --------------------------
let callStream = null // Variável para armazenar o stream da mídia (câmera/mic)

$('#startCall')?.addEventListener('click',async()=>{
  try{
    // Solicita acesso à câmera e microfone
    callStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true})
    $('#callVideo').srcObject = callStream
    // ID de sessão simulado
    $('#callId').textContent = 'sess-' + Math.random().toString(36).slice(2,9)
    $('#teleActive').textContent = 1 // Atualiza o contador no dashboard
  }catch(err){
    console.error('Acesso à mídia negado:', err)
    alert('ERRO: Não foi possível acessar câmera/microfone. Permissão negada ou dispositivo indisponível.')
  }
})

$('#endCall')?.addEventListener('click',()=>{
  if(callStream){
    // Interrompe todas as tracks (câmera/mic)
    callStream.getTracks().forEach(t=>t.stop());
    callStream = null;
    $('#callVideo').srcObject = null
  }
  // Limpa as infos de sessão
  $('#callId').textContent = '—'
  $('#teleActive').textContent = 0
})

// --------------------------- Agendamento ONLINE (Telemedicina) ------------
const availableTimes = [
  "08:00", "09:00", "10:00", "13:00", "14:00", "15:00"
]
// Define a data mínima para agendamento (a partir de hoje)
if($('#teleDate')) $('#teleDate').min = new Date().toISOString().slice(0,10)

/** Preenche o <select> de horários disponíveis. */
function populateTeleTimes(){
  const sel = $('#teleTime')
  if(!sel) return
  sel.innerHTML = ''
  availableTimes.forEach(t=>{
    sel.innerHTML += `<option value="${t}">${t}</option>`
  })
}

/** Checa se horário ocupado */
function isTimeOccupied(date, time, profId = 3){
  return appState.appointments.some(a =>
    a.date === date &&
    a.time === time &&
    (Number(a.prof) === profId)
  )
}

/** Renderiza a tabela de agendamentos de telemedicina. */
function renderTeleAppointments(){
  const tbody = $('#teleAppointmentsList')
  if(!tbody) return
  tbody.innerHTML = ''

  const sortedAppointments = appState.appointments.slice().sort((a,b)=>{
    const dateComp = a.date.localeCompare(b.date)
    if(dateComp !== 0) return dateComp
    return a.time.localeCompare(b.time)
  })

  sortedAppointments.forEach(a=>{
    const patientData = typeof a.patient === 'number'
      ? appState.patients.find(p=>p.id===a.patient)
      : null

    const patientName = patientData?.name || a.patient || `Paciente #${a.patient}`
    const contact = a.contact || patientData?.contact || ''
    const symptoms = a.symptoms || ''

    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${escapeHtml(patientName)}</td><td class="small muted">${escapeHtml(contact)}</td><td class="small muted">${escapeHtml(symptoms)}</td><td class="small muted">${a.date}</td><td class="small muted">${a.time}</td><td><button data-id="${a.id}" class="cancelAppointment ghost">Cancelar</button></td>`
    tbody.appendChild(tr)
  })

  $$('.cancelAppointment').forEach(b=>{
    b.addEventListener('click',e=>{
      cancelAppointment(Number(e.target.dataset.id))
    })
  })
}

/** Remove um agendamento da lista. */
function cancelAppointment(id){
  if(!confirm('Confirma o cancelamento deste agendamento?')) return

  const initialLength = appState.appointments.length
  appState.appointments = appState.appointments.filter(a => a.id !== id)

  if(appState.appointments.length === initialLength) {
    return alert('Erro: Agendamento não encontrado.')
  }

  persist()
  renderStats()
  renderTeleAppointments() // Atualiza a lista
  alert('Agendamento cancelado com sucesso.')
}

// Handler para o agendamento de telemedicina (formulário público)
$('#bookTeleAppointment')?.addEventListener('click',()=>{
  // Captura valores do formulário
  const name = ($('#teleName')?.value || '').trim()
  const contact = ($('#teleContact')?.value || '').trim()
  const symptoms = ($('#teleSymptoms')?.value || '').trim()
  const date = $('#teleDate')?.value
  const time = $('#teleTime')?.value

  // Validação básica
  if(!name || !contact || !symptoms || !date || !time){
    return alert('ERRO: Preencha todos os campos para agendar a teleconsulta.')
  }

  // Verifica conflito de horário (apenas para o Profissional de Telemedicina ID=3)
  const TELEMED_PROF_ID = 3
  if(isTimeOccupied(date, time, TELEMED_PROF_ID)){
    return alert('ERRO: Horário já ocupado pelo Dr. Felipe Rocha. Escolha outra opção.')
  }

  // Cria o objeto de agendamento (com dados do formulário)
  const newAppointment = {
    id: Date.now(),
    patient: name, // Aqui armazena o nome, não o ID (agendamento público)
    contact,
    symptoms,
    prof: TELEMED_PROF_ID,
    date,
    time
  }

  appState.appointments.push(newAppointment)
  persist()
  renderStats()

  // Limpa o formulário após sucesso
  if($('#teleName')) $('#teleName').value = ''
  if($('#teleContact')) $('#teleContact').value = ''
  if($('#teleSymptoms')) $('#teleSymptoms').value = ''

  alert(`Teleconsulta agendada para ${name} em ${date} às ${time}. Aguarde contato.`)
})

// --------------------------- Hooks adicionais / Relatórios ------------------
$$('.navitem').forEach(el=>{
  if(el.dataset.section === 'telemedicina'){
    el.addEventListener('click',()=>{
      populateTeleTimes()
      renderTeleAppointments()
    })
  }
})

$('#generateReport')?.addEventListener('click',()=>{
  const type = $('#reportType').value
  const reportData = {
    type,
    generated: new Date().toISOString(),
    counts: {
      patients: appState.patients.length,
      appointments: appState.appointments.length,
      beds_occupied: appState.beds.occupied,
      professionals: appState.professionals.length
    }
  }

  showModal(`<h3>Relatório — ${escapeHtml(type)}</h3>
    <p class="small muted">(Resumo gerado localmente no protótipo)</p>
    <pre style="white-space:pre-wrap; max-height: 400px; overflow: auto;">` +
      escapeHtml(JSON.stringify(reportData, null, 2)) +
      `</pre>
    <div style="margin-top:8px"><button onclick="closeModal()">Fechar</button></div>`)
})

// Configurações de segurança (Simulação)
$('#securityForm')?.addEventListener('submit',e=>{
  e.preventDefault()
  console.log('Dados de segurança a serem salvos (simulação):', new FormData(e.target))
  alert('Configurações de segurança salvas (simulação).')
})

// Modal de ajuda/perfil
$('#helpBtn')?.addEventListener('click',()=>{
  showModal(`<h3>Ajuda & Orientações</h3>
    <p class="small muted">Este é um protótipo, todas as ações são simuladas localmente no navegador (localStorage). 
    <br>Desenvolvido para projeto acadêmico.</p>`)
})

$('#profileBtn')?.addEventListener('click',()=>showModal('<h3>Perfil do Usuário</h3><p class="small muted">Aluna: Andressa Bruna Gobbi</p>'))

// --------------------------- Utilitários -----------------------------------
/** Função utilitária para prevenir XSS simples em renderizações. */
function escapeHtml(str){
  if(str === undefined || str === null) return ''
  return String(str).replace(/[&<>"']/g, s => ( {
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[s]))
}

// Inicia a aplicação (Entry Point)
init()
