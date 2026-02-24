# 📝 Plano de Implementação: Nota Fiscal (Reforma Tributária 2026)

Este plano descreve as etapas necessárias para adaptar o **GestBarismo** à nova forma de emissão de nota fiscal no Brasil, considerando a **Reforma Tributária (IBS/CBS)** e a obrigatoriedade da **NFS-e Nacional/NFC-e unificada**.

## 1. Mudanças na Estrutura de Dados (Banco de Dados)   

Atualmente, o sistema não armazena informações fiscais. Precisamos adicionar campos essenciais para a emissão.

### Tabela `products`
Adicionar campos necessários para identificar o produto fiscalmente:
- `ncm`: Nomenclatura Comum do Mercosul (8 dígitos).
- `gtin`: Código de barras (EAN).
- `tax_origem`: Origem da mercadoria (0 - Nacional, 1 - Importada, etc).
- `ibs_rate`: Alíquota do Imposto sobre Bens e Serviços (Novo).
- `cbs_rate`: Alíquota da Contribuição sobre Bens e Serviços (Novo).

### Tabela `orders`
Adicionar campos para o cliente e status da nota:
- `client_cpf_cnpj`: Para o "CPF na nota".
- `nf_status`: Status da nota (Pendente, Emitida, Erro, Cancelada).
- `nf_key`: Chave de acesso da nota.
- `nf_number`: Número da nota.
- `nf_url`: Link para o DANFE/XML.

## 2. Interface (Frontend)

### Cadastro de Produtos (`ProductModal.tsx`)
- Adicionar uma aba ou seção de "Informações Fiscais".
- Campos: NCM (com máscara), GTIN, Origem e Alíquotas sugeridas.

### Finalização de Pedido (`OrderView.tsx` / `NewOrderModal.tsx`)
- Campo opcional para "CPF/CNPJ do Cliente".
- Botão "Emitir Nota Fiscal" após o pagamento.

## 3. Integração (Backend)

Recomendamos o uso de uma **API de Notas Fiscais** (como PlugNotas, Focus NFE ou WebMania) para lidar com a complexidade técnica:
- Geração de XML assinado.
- Comunicação com a SEFAZ.
- Gestão de Certificado Digital A1.

### Fluxo de Emissão:
1. O usuário clica em "Emitir Nota".
2. O sistema envia os dados do pedido para uma **Supabase Edge Function**.
3. A Edge Function formata o JSON conforme o novo padrão da Reforma Tributária (IBS/CBS).
4. A API parceira processa e retorna o status e link do DANFE.
5. O sistema atualiza a tabela `orders` com os dados da nota.

## 4. Próximos Passos
1. **[Concluído]** Aplicar migração no banco de dados (SQL gerado).
2. **[Concluído]** Atualizar os formulários no React (Cadastro e Pedido).
3. **[Futuro]** Escolher um provedor de API e configurar a integração na Edge Function.
