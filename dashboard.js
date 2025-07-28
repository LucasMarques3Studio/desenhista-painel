// =====================================================================
// VERSÃO FINAL COMPLETA DO dashboard.js - COM BOTÃO DE ATUALIZAR
// =====================================================================
const auth = firebase.auth();
const db = firebase.firestore();

window.addEventListener('DOMContentLoaded', () => {

    // Referências para os elementos HTML da página.
    const userNameDisplay = document.getElementById('userName');
    const logoutButton = document.getElementById('logoutButton');
    const appContent = document.getElementById('app-content');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalRefreshButton = document.getElementById('modal-refresh-button'); // Novo botão

    // Variáveis de estado
    let dadosPlanilha = null; // Guarda os dados em cache
    let desenhistaAtualNaModal = null; // Guarda quem está sendo visualizado na modal

    // === VIGIA DE AUTENTICAÇÃO ===
    auth.onAuthStateChanged(user => {
        if (user) {
            loadDashboard(user);
        } else {
            window.location.replace('index.html');
        }
    });

    // === FUNÇÃO PRINCIPAL PARA CARREGAR O DASHBOARD ===
    function loadDashboard(user) {
        db.collection('usuarios').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    const nome = userData.nome;
                    const role = userData.role;
                    userNameDisplay.textContent = nome;

                    if (role === 'ADMIN') {
                        renderAdminView();
                    } else if (role === 'Desenhista') {
                        renderDesenhistaView(user.uid, nome);
                    }
                } else {
                    auth.signOut();
                }
            })
            .catch(error => console.error("Erro ao buscar dados do usuário:", error));
    }

    // === LÓGICA DE ATUALIZAÇÃO E RENDERIZAÇÃO DA MODAL (REESTRUTURADA) ===
    
    // Esta nova função FORÇA a busca na API e atualiza a modal
    async function recarregarDadosEAtualizarModal(nomeDesenhista) {
        document.getElementById('month-buttons').innerHTML = 'Atualizando dados...';
        document.getElementById('error-details-container').innerHTML = '';

        try {
            const apiUrl = 'https://script.google.com/macros/s/AKfycbxkjtqlE3Da1bmWdpdWGANDBp71_QoB0FZEYTqBceNkzEBnrCvmYjFuA2_vpNoCNTK33A/exec';
            if (apiUrl === 'COLE_AQUI_A_URL_DO_SEU_APP_DA_WEB') {
                alert('Erro: A URL da API do Google Sheets não foi configurada no arquivo dashboard.js');
                return;
            }
            const response = await fetch(apiUrl);
            // Sobrescreve o cache com os novos dados
            dadosPlanilha = await response.json();
            console.log("Dados atualizados da API:", dadosPlanilha);

            // Continua para renderizar os botões com os novos dados
            renderizarMesesNaModal(nomeDesenhista);

        } catch (error) {
            console.error("Erro ao recarregar dados da API:", error);
            document.getElementById('month-buttons').innerHTML = 'Erro ao carregar dados da planilha.';
        }
    }

    // Esta função agora apenas renderiza os botões com os dados que já temos
    function renderizarMesesNaModal(nomeDesenhista) {
        const dadosDoDesenhista = dadosPlanilha[nomeDesenhista.toLowerCase().replace(' ', '.')];

        if (!dadosDoDesenhista || Object.keys(dadosDoDesenhista).length === 0) {
            document.getElementById('month-buttons').innerHTML = 'Nenhum dado de erro encontrado para este desenhista.';
            return;
        }

        const meses = Object.keys(dadosDoDesenhista);
        const monthButtonsContainer = document.getElementById('month-buttons');
        monthButtonsContainer.innerHTML = '';
        meses.forEach(mes => {
            const button = document.createElement('button');
            button.textContent = mes.charAt(0).toUpperCase() + mes.slice(1);
            button.onclick = () => exibirDetalhesDoMes(dadosDoDesenhista[mes]);
            monthButtonsContainer.appendChild(button);
        });
    }

    // A função que abre a modal agora está mais simples
    async function abrirModalErros(nomeDesenhista) {
        desenhistaAtualNaModal = nomeDesenhista; // Guarda o nome do desenhista em foco
        document.getElementById('error-details-container').innerHTML = '';
        modalOverlay.classList.remove('hidden');

        // Se for a primeira vez que abrimos, busca os dados.
        // Nas próximas vezes, usa o cache, a menos que o botão de atualizar seja clicado.
        if (!dadosPlanilha) {
            await recarregarDadosEAtualizarModal(nomeDesenhista);
        } else {
            // Se já temos dados, apenas renderiza os meses
            renderizarMesesNaModal(nomeDesenhista);
        }
    }

    // Não há mudanças nesta função
    function exibirDetalhesDoMes(dadosDoMes) {
        const detailsContainer = document.getElementById('error-details-container');
        const rankAtual = dadosDoMes.rankAtual;
        const rankAnterior = dadosDoMes.rankAnterior;
        const erros = dadosDoMes.erros;
        let totalErros = 0;
        let html = `<div class="rank-container"><div class="rank-item"><strong>Posição Atual (Rank):</strong> ${rankAtual}</div><div class="rank-item"><strong>Posição Mês Anterior (Rank):</strong> ${rankAnterior}</div></div>`;
        if (erros.length > 0) {
            html += `<table class="error-table"><thead><tr><th>Tipo de Erro</th><th>Quantidade</th></tr></thead><tbody>`;
            erros.forEach(erro => {
                const quantidade = parseInt(erro.quantidade) || 0;
                html += `<tr><td>${erro.tipo}</td><td>${quantidade}</td></tr>`;
                totalErros += quantidade;
            });
            html += `<tr class="total-row"><td>TOTAL DE ERROS</td><td>${totalErros}</td></tr></tbody></table>`;
        } else {
            html += "<p style='margin-top: 20px;'>Nenhum erro registrado para este mês.</p>";
        }
        detailsContainer.innerHTML = html;
    }


    // === EVENT LISTENERS E OUTRAS FUNÇÕES (sem mudanças significativas) ===

    renderAdminView = async function() { // Declarando como variável para manter o escopo
        appContent.innerHTML = "<p>Carregando painel do administrador...</p>";
        const desenhistas = [];
        try {
            const querySnapshot = await db.collection('usuarios').where('role', '==', 'Desenhista').get();
            querySnapshot.forEach(doc => desenhistas.push({ id: doc.id, ...doc.data() }));
            const metaGrupoDoc = await db.collection('metas').doc('grupo').get();
            const metaGrupoAtual = metaGrupoDoc.exists ? metaGrupoDoc.data().metaArtes : 0;
            const htmlContent = `<h1>Painel de Controle do Administrador</h1><div class="admin-container"><div class="admin-card"><h2>Meta Geral da Equipe</h2><div class="form-group"><label for="meta-grupo-input">Meta de Artes do Grupo:</label><input type="number" id="meta-grupo-input" value="${metaGrupoAtual}"><button id="salvar-meta-grupo">Salvar</button></div></div><div class="admin-card"><h2>Metas Individuais dos Desenhistas</h2><div class="form-group"><label for="desenhista-select">Selecione um Desenhista:</label><select id="desenhista-select"><option value="">-- Escolha um desenhista --</option>${desenhistas.map(d => `<option value="${d.id}">${d.nome}</option>`).join('')}</select></div><div id="gerenciador-individual"></div></div></div>`;
            appContent.innerHTML = htmlContent;
            document.getElementById('salvar-meta-grupo').addEventListener('click', salvarMetaGrupo);
            document.getElementById('desenhista-select').addEventListener('change', (event) => {
                const desenhistaId = event.target.value;
                if (desenhistaId) {
                    const desenhistaSelecionado = desenhistas.find(d => d.id === desenhistaId);
                    displayGerenciadorIndividual(desenhistaId, desenhistaSelecionado.nome);
                } else {
                    document.getElementById('gerenciador-individual').innerHTML = '';
                }
            });
        } catch (error) {
            console.error("Erro ao renderizar a visão do Admin:", error);
        }
    }

    renderDesenhistaView = async function(uid, nome) { // Declarando como variável
        const htmlContent = `<h1>Seu Painel, ${nome}</h1><div class="cards-container"><div class="card"><h2>Sua Meta de Artes</h2><p id="meta-individual-valor" class="data-value">...</p></div><div class="card"><h2>Meta do Grupo</h2><p id="meta-grupo-valor" class="data-value">...</p></div><div id="erros-card" class="card" style="cursor: pointer;"><h2>Detalhes de Erros</h2><p class="data-value" style="font-size: 24px; color: #007bff;">Clique para ver</p></div></div>`;
        appContent.innerHTML = htmlContent;
        try {
            const metasIndividuaisDoc = await db.collection('metas').doc('individuais').get();
            const metaGrupoDoc = await db.collection('metas').doc('grupo').get();
            const metaIndividual = metasIndividuaisDoc.exists ? (metasIndividuaisDoc.data()[uid] || 0) : 0;
            const metaGrupo = metaGrupoDoc.exists ? metaGrupoDoc.data().metaArtes : 0;
            document.getElementById('meta-individual-valor').textContent = metaIndividual;
            document.getElementById('meta-grupo-valor').textContent = metaGrupo;
        } catch (error) { console.error("Erro ao buscar metas:", error); }
        document.getElementById('erros-card').addEventListener('click', () => abrirModalErros(nome));
    }

    displayGerenciadorIndividual = async function(desenhistaId, desenhistaNome) { // Declarando como variável
        const container = document.getElementById('gerenciador-individual');
        container.innerHTML = '<p>Carregando meta...</p>';
        try {
            const metasIndividuaisDoc = await db.collection('metas').doc('individuais').get();
            const metaAtual = metasIndividuaisDoc.exists ? (metasIndividuaisDoc.data()[desenhistaId] || 0) : 0;
            const html = `<div class="form-group"><label for="meta-individual-input">Meta para ${desenhistaNome}:</label><input type="number" id="meta-individual-input" value="${metaAtual}"><button id="salvar-meta-individual">Salvar</button></div><div class="form-group" style="margin-top: 15px;"><button id="admin-ver-erros" class="secondary-button">Ver Detalhes de Erros</button></div>`;
            container.innerHTML = html;
            document.getElementById('salvar-meta-individual').addEventListener('click', () => { const novoValor = document.getElementById('meta-individual-input').value; salvarMetaIndividual(desenhistaId, parseInt(novoValor, 10)); });
            document.getElementById('admin-ver-erros').addEventListener('click', () => { abrirModalErros(desenhistaNome); });
        } catch (error) { console.error("Erro ao buscar meta individual:", error); }
    }

    function salvarMetaGrupo() { const novoValor = document.getElementById('meta-grupo-input').value; const valorNumerico = parseInt(novoValor, 10); if (isNaN(valorNumerico)) { alert('Por favor, insira um número válido.'); return; } db.collection('metas').doc('grupo').update({ metaArtes: valorNumerico }).then(() => alert('Meta do grupo atualizada com sucesso!')).catch(error => { console.error("Erro ao salvar meta do grupo: ", error); }); }
    function salvarMetaIndividual(uid, valor) { if (isNaN(valor)) { alert('Por favor, insira um número válido.'); return; } db.collection('metas').doc('individuais').update({ [uid]: valor }).then(() => alert('Meta individual atualizada com sucesso!')).catch(error => { console.error("Erro ao salvar meta individual: ", error); }); }

    // Event Listeners para os botões da modal e logout
    modalCloseButton.addEventListener('click', () => modalOverlay.classList.add('hidden'));
    modalRefreshButton.addEventListener('click', () => {
        if (desenhistaAtualNaModal) {
            recarregarDadosEAtualizarModal(desenhistaAtualNaModal);
        }
    });
    window.addEventListener('click', (event) => { if (event.target === modalOverlay) { modalOverlay.classList.add('hidden'); } });
    logoutButton.addEventListener('click', () => { auth.signOut(); });

}); // FIM DO DOMContentLoaded