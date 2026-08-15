//  Produto 
  id: number;
  codigo: string;
  descricao: string;
  saldo: number;
  created_at: string;
  updated_at: string;
}

export interface CriarProdutoDTO {
  codigo: string;
  descricao: string;
  saldo: number;
}

export interface AtualizarProdutoDTO {
  descricao: string;
  saldo: number;
}

// Nota Fiscal 

export type StatusNota = 'Aberta' | 'Fechada';

export interface ItemNota {
  id: number;
  nota_fiscal_id: number;
  produto_id: number;
  codigo_produto: string;
  descricao: string;
  quantidade: number;
  created_at: string;
}

export interface NotaFiscal {
  id: number;
  numero: number;
  status: StatusNota;
  itens: ItemNota[];
  created_at: string;
  updated_at: string;
}

export interface AdicionarItemDTO {
  produto_id: number;
  quantidade: number;
}

export interface ImprimirNotaResponse {
  message: string;
  nota: NotaFiscal;
}

export interface ApiError {
  error: string;
  detail?: string;
  itens?: string[];
  saldo_disponivel?: number;
}
