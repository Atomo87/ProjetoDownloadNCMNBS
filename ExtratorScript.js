// =====================================================================
//  Portal Conformidade Facil (SVRS) - Classificacao Tributaria 
//  Cole no console (F12) com a grade carregada na tela.
//
//  Cada linha de classificacao e um <tr id="CST-CODCLASSTRIB"> que carrega
//  o registro COMPLETO em jQuery(tr).data('full-data')

//   
//    1) classificacoes.csv -> 1 linha por CODIGO de anexo. Os dados da
//       classificacao se repetem; o codigo vai para a coluna Ncm OU NBS
//       conforme o tipo. Classificacao sem anexo = 1 linha (Ncm/NBS vazias).
 
// =====================================================================

(function () {
    'use strict';

    if (!window.jQuery) { alert('jQuery nao encontrado nesta pagina.'); return; }
    const $ = window.jQuery;

    const MAPA_ALIQ = {};
    const MAPA_RBSN = {};

    const DFE_FLAGS = {
        IndBpe: 'BPE', IndBpeta: 'BPETA', IndBpetm: 'BPETM', IndCte: 'CTE',
        IndCteos: 'CTEOS', IndNf3e: 'NF3E', IndNfag: 'NFAG', IndNfce: 'NFCE',
        IndNfcom: 'NFCOM', IndNfe: 'NFE', IndNfse: 'NFSE', IndNfgas: 'NFGAS',
        IndNfsvia: 'NFSVIA', IndNfabi: 'NFABI', IndDir: 'DIR', IndDuimp: 'DUIMP',
        IndDere: 'DERE'
    };
    const MONO_FLAGS = {
        IndMonoRet: 'Retido', IndMonoRetem: 'Retencao', IndMonoDif: 'Diferido',
        IndMonoVal: 'Valor'
    };

    const bool   = v => v ? 'Sim' : 'Nao';
    const dataBR = s => s ? new Date(s).toLocaleDateString('pt-BR') : '';
    const dfeList  = d => Object.entries(DFE_FLAGS).filter(([k]) => d[k]).map(([, v]) => v).sort().join(', ');
    const monoList = d => Object.entries(MONO_FLAGS).filter(([k]) => d[k]).map(([, v]) => v).join(', ');

    // ---- 1. localizar todas as linhas-carrier -----------------------
    const carriers = [...document.querySelectorAll('tr[id]')]
        .filter(tr => /^\d{3}-\d{6}$/.test(tr.id) && $(tr).data('full-data'));

    if (!carriers.length) { alert('Nenhuma classificacao encontrada. Abra a grade primeiro.'); return; }

    // mapa numero -> rotulo (Tipo Aliquota / RB SN) lido da propria grade
    carriers.forEach(tr => {
        const d = $(tr).data('full-data');
        const tds = tr.querySelectorAll(':scope > td');
        if (tds.length >= 14) {
            const a = tds[8].textContent.trim();
            const r = tds[9].textContent.trim();
            if (a) MAPA_ALIQ[d.TipoAliq] = a;
            if (r) MAPA_RBSN[d.TipoRbSn] = r;
        }
    });

    // ---- 2. montar estrutura ---------------------------------------
    const classificacoes = [];
    const anexos = [];

    carriers.forEach(tr => {
        const d = $(tr).data('full-data');
        const cstNav = d.CstNavigation || {};
        const anexosArr = d.Anexos || [];

        // dados fixos da classificacao (repetidos em cada linha)
        const base = {
            CST:                  d.Cst,
            CST_Nome:             cstNav.NomeCst || '',
            cClassTrib:           d.CodClassTrib,          // o sequencial
            Classif_Nome:         d.NomeClassTrib || '',
            Classif_NomeReduzido: d.NomeReduzido || '',
            CST_ExigeTributacao:  bool(cstNav.IndExigeTrib),
            CST_ReducaoBC:        bool(cstNav.IndReducaoBc),
            CST_ReducaoAliquota:  bool(cstNav.IndReducaoAliq),
            CST_TransfCredito:    bool(cstNav.IndTransferenciaCred),
            CST_Diferimento:      bool(cstNav.IndDiferimento),
            CST_Monofasica:       bool(cstNav.IndMonofasica),
            CST_CredPresIbsZfm:   bool(cstNav.IndCredPresIbsZfm),
            CST_AjusteCredito:    bool(cstNav.IndAjusteCompet),
            PercRedIBS:           d.PercRedIbs,
            PercRedCBS:           d.PercRedCbs,
            TributacaoRegular:    bool(d.IndTribRegular),
            CreditoPresumido:     bool(d.IndPermiteCredPres),
            EstornoCredito:       bool(d.IndEstornoCred),
            PercBioCombustivel:   bool(d.IndPbioDiferenca),
            Monofasica_Tipos:     monoList(d),
            TipoAliquota:         MAPA_ALIQ[d.TipoAliq] || String(d.TipoAliq ?? ''),
            RB_SimplesNacional:   MAPA_RBSN[d.TipoRbSn] || String(d.TipoRbSn ?? ''),
            DFes_Relacionados:    dfeList(d),
            Legislacao:           d.TexUrlLegislacao || '',
            VigenciaInicio:       dataBR(d.DthIniVig),
            VigenciaFim:          dataBR(d.DthFimVig)
        };

        // 1 linha por codigo de anexo. O codigo vai para Ncm OU NBS
        // conforme o tipo; a outra coluna fica vazia.
        // Classificacao sem anexo -> 1 linha com as duas colunas vazias.
        if (!anexosArr.length) {
            classificacoes.push({ ...base, Ncm: '', NBS: '' });
        } else {
            anexosArr.forEach(a => {
                 if(a.TipoPermissao == "VEDADO"){
                 return;
                 }  
                const tipo = (a.TipoCodigo || '').toUpperCase();
                classificacoes.push({
                    ...base,
                    Ncm: tipo === 'NCM' ? (a.CodNcmNbs || '') : '',
                    NBS: tipo === 'NBS' ? (a.CodNcmNbs || '') : ''
                });
            });
        }

        anexosArr.forEach((a, i) => {
            anexos.push({
                CST:            d.Cst,
                cClassTrib:     d.CodClassTrib,           // amarra ao sequencial
                Classif_Nome:   d.NomeReduzido || '',
                Item:           i + 1,
                TipoCodigo:     a.TipoCodigo || '',
                Codigo:         a.CodNcmNbs || '',
                VigenciaInicio: dataBR(a.DthIniVig),
                VigenciaFim:    dataBR(a.DthFimVig),
                Permissao:      a.TipoPermissao || '',
                DescricaoAnexo: a.DescAnexo || '',
                DescricaoItem:  a.DescItemAnexo || '',
                Condicao:       a.DescCondicao || '',
                Excecao:        a.DescExcecao || '',
                Observacao:     a.Observacao || '',
                ItemAnexoLei:   a.NroItemAnexoLei || ''
            });
        });
    });

    // ---- 3. exportar ----------------------------------------------
 
    const COLS_TEXTO = ['CST', 'cClassTrib', 'Codigo', 'Ncm', 'NBS'];



 
///////////////////////// INICIO TRECHO SQL GERADOR//////////////////////

// ---- Scape SQL --------------------
    function escSQL(val) {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? '1' : '0';
        // Escapar aspas simples e caracteres especiais
        return `'${String(val).replace(/'/g, "''").replace(/\n/g, ' ').replace(/\r/g, ' ')}'`;
    }

    // ---- 5. Gerar SQL INSERT para classificacoes --------------------
    function gerarSQLInsert(tabela, dados) {
        if (!dados.length) return '-- Nenhum dado para inserir';
        
        const colunas = Object.keys(dados[0]);
        const sqlParts = [];
        
        dados.forEach((row) => {
            const valores = colunas.map(col => escSQL(row[col]));
            sqlParts.push(
                `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${valores.join(', ')});`
            );
        });
        
        return sqlParts.join('\n');
    }
 
    // ----   Gerar e baixar os scripts SQL -----------
    function baixarSQL(nome, sql) {
        if (!sql || sql === '-- Nenhum dado para inserir') {
            console.warn(`⚠️ Sem dados para ${nome}`);
            return;
        }
        
        const blob = new Blob([sql], { type: 'text/plain;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nome.endsWith('.sql') ? nome : `${nome}.sql`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }
 ///////////////////////// FIM TRECHO SQL GERADOR//////////////////////


 /////////////////////////////// BAiXAR CSV///////////////////////////////////////////
    function baixarCSV(nome, linhas) {
        if (!linhas.length) return;
        const cols = Object.keys(linhas[0]);
        const escCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const cell = (col, v) => {
            const s = String(v ?? '');
            if (COLS_TEXTO.includes(col) && s !== '' && !s.includes('\n')) {
                return `"=""${s.replace(/"/g, '""')}"""`;   // ="valor"
            }
            return escCsv(s);
        };
        const csv = [cols.join(';')]
            .concat(linhas.map(o => cols.map(c => cell(c, o[c])).join(';')))
            .join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }

    // Baixar e Gerar arquivo CSV
    baixarCSV('classificacoes.csv', classificacoes);


     // Gerar SQLs
    const sqlClassificacoes = gerarSQLInsert('classificacoes_tributarias', classificacoes);
 
    // Baixar e Gerar arquivo SQL
    baixarSQL('classificacoes_tributarias.sql',sqlClassificacoes);

 
  
})();
