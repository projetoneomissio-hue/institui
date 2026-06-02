export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          alergias: string | null
          autoriza_imagem: boolean | null
          bairro: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string
          declaracao_assinada: boolean | null
          endereco: string | null
          escola: string | null
          foto_url: string | null
          grau_parentesco: string | null
          id: string
          medicamentos: string | null
          nome_completo: string
          observacoes: string | null
          origem_cadastro: Json | null
          profissao: string | null
          responsavel_id: string
          rg: string | null
          serie_ano: string | null
          telefone: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          alergias?: string | null
          autoriza_imagem?: boolean | null
          bairro?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento: string
          declaracao_assinada?: boolean | null
          endereco?: string | null
          escola?: string | null
          foto_url?: string | null
          grau_parentesco?: string | null
          id?: string
          medicamentos?: string | null
          nome_completo: string
          observacoes?: string | null
          origem_cadastro?: Json | null
          profissao?: string | null
          responsavel_id: string
          rg?: string | null
          serie_ano?: string | null
          telefone?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Update: {
          alergias?: string | null
          autoriza_imagem?: boolean | null
          bairro?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string
          declaracao_assinada?: boolean | null
          endereco?: string | null
          escola?: string | null
          foto_url?: string | null
          grau_parentesco?: string | null
          id?: string
          medicamentos?: string | null
          nome_completo?: string
          observacoes?: string | null
          origem_cadastro?: Json | null
          profissao?: string | null
          responsavel_id?: string
          rg?: string | null
          serie_ano?: string | null
          telefone?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      anamneses: {
        Row: {
          alergias: string | null
          aluno_id: string
          condicoes_medicas: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_relacao: string | null
          contato_emergencia_telefone: string | null
          created_at: string
          doenca_cronica: string | null
          id: string
          is_pne: boolean | null
          laudo_url: string | null
          medicamentos: string | null
          observacoes: string | null
          pne_cid: string | null
          pne_descricao: string | null
          tem_laudo: boolean | null
          tipo_sanguineo: string | null
          updated_at: string
        }
        Insert: {
          alergias?: string | null
          aluno_id: string
          condicoes_medicas?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_relacao?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string
          doenca_cronica?: string | null
          id?: string
          is_pne?: boolean | null
          laudo_url?: string | null
          medicamentos?: string | null
          observacoes?: string | null
          pne_cid?: string | null
          pne_descricao?: string | null
          tem_laudo?: boolean | null
          tipo_sanguineo?: string | null
          updated_at?: string
        }
        Update: {
          alergias?: string | null
          aluno_id?: string
          condicoes_medicas?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_relacao?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string
          doenca_cronica?: string | null
          id?: string
          is_pne?: boolean | null
          laudo_url?: string | null
          medicamentos?: string | null
          observacoes?: string | null
          pne_cid?: string | null
          pne_descricao?: string | null
          tem_laudo?: boolean | null
          tipo_sanguineo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "alunos_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          ativa: boolean
          capacidade_maxima: number | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          unidade_id: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativa?: boolean
          capacidade_maxima?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          unidade_id?: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          ativa?: boolean
          capacidade_maxima?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          unidade_id?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "atividades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendario_escolar: {
        Row: {
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          eh_dia_letivo: boolean | null
          id: string
          tipo: string | null
          titulo: string
          unidade_id: string
        }
        Insert: {
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          eh_dia_letivo?: boolean | null
          id?: string
          tipo?: string | null
          titulo: string
          unidade_id: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          eh_dia_letivo?: boolean | null
          id?: string
          tipo?: string | null
          titulo?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendario_escolar_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          aluno_id: string
          carga_horaria_horas: number | null
          codigo_validacao: string
          created_at: string | null
          data_emissao: string | null
          id: string
          matricula_id: string
          nome_curso: string
          status: Database["public"]["Enums"]["status_certificado"] | null
          unidade_id: string
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          carga_horaria_horas?: number | null
          codigo_validacao: string
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          matricula_id: string
          nome_curso: string
          status?: Database["public"]["Enums"]["status_certificado"] | null
          unidade_id: string
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          carga_horaria_horas?: number | null
          codigo_validacao?: string
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          matricula_id?: string
          nome_curso?: string
          status?: Database["public"]["Enums"]["status_certificado"] | null
          unidade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicado_envios: {
        Row: {
          canal: string
          comunicado_id: string
          created_at: string
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          responsavel_id: string
          status: string
        }
        Insert: {
          canal: string
          comunicado_id: string
          created_at?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          responsavel_id: string
          status?: string
        }
        Update: {
          canal?: string
          comunicado_id?: string
          created_at?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          responsavel_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicado_envios_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          agendado_para: string | null
          canal: string[]
          conteudo: string
          created_at: string | null
          created_by: string | null
          criado_por: string | null
          destinatario_id: string | null
          enviado_em: string | null
          id: string
          mensagem: string | null
          recorrencia: string | null
          status: string
          tipo: string
          titulo: string
          turma_id: string | null
          unidade_id: string
          urgente: boolean | null
        }
        Insert: {
          agendado_para?: string | null
          canal?: string[]
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          criado_por?: string | null
          destinatario_id?: string | null
          enviado_em?: string | null
          id?: string
          mensagem?: string | null
          recorrencia?: string | null
          status?: string
          tipo: string
          titulo: string
          turma_id?: string | null
          unidade_id?: string
          urgente?: boolean | null
        }
        Update: {
          agendado_para?: string | null
          canal?: string[]
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          criado_por?: string | null
          destinatario_id?: string | null
          enviado_em?: string | null
          id?: string
          mensagem?: string | null
          recorrencia?: string | null
          status?: string
          tipo?: string
          titulo?: string
          turma_id?: string | null
          unidade_id?: string
          urgente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      contact_logs: {
        Row: {
          aluno_id: string
          created_at: string
          data_contato: string
          descricao: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_contato"]
          updated_at: string
          user_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_contato?: string
          descricao: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          updated_at?: string
          user_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_contato?: string
          descricao?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_logs_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_logs_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coordenador_atividades: {
        Row: {
          atividade_id: string
          coordenador_id: string
          created_at: string
          id: string
        }
        Insert: {
          atividade_id: string
          coordenador_id: string
          created_at?: string
          id?: string
        }
        Update: {
          atividade_id?: string
          coordenador_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordenador_atividades_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordenador_atividades_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_predio: {
        Row: {
          created_at: string
          data_competencia: string
          id: string
          item: string
          tipo: string
          unidade_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_competencia: string
          id?: string
          item: string
          tipo: string
          unidade_id?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_competencia?: string
          id?: string
          item?: string
          tipo?: string
          unidade_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_predio_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      frequencia: {
        Row: {
          created_at: string | null
          data: string
          id: string
          matricula_id: string
          observacoes: string | null
          presente: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: string
          id?: string
          matricula_id: string
          observacoes?: string | null
          presente?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          matricula_id?: string
          observacoes?: string | null
          presente?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          created_at: string
          funcao: string
          id: string
          nome: string
          salario: number
          unidade_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao: string
          id?: string
          nome: string
          salario: number
          unidade_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          salario?: number
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      locacoes: {
        Row: {
          created_at: string
          data: string
          evento: string
          horario_fim: string
          horario_inicio: string
          id: string
          observacoes: string | null
          responsavel_nome: string
          responsavel_telefone: string | null
          unidade_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          evento: string
          horario_fim: string
          horario_inicio: string
          id?: string
          observacoes?: string | null
          responsavel_nome: string
          responsavel_telefone?: string | null
          unidade_id?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          evento?: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
          observacoes?: string | null
          responsavel_nome?: string
          responsavel_telefone?: string | null
          unidade_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "locacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          aluno_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          dia_vencimento: number | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_matricula"]
          turma_id: string
          unidade_id: string
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          dia_vencimento?: number | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_matricula"]
          turma_id: string
          unidade_id?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dia_vencimento?: number | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_matricula"]
          turma_id?: string
          unidade_id?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      observacoes: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          id: string
          observacao: string
          professor_id: string
          tipo: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data?: string
          id?: string
          observacao: string
          professor_id: string
          tipo: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string
          professor_id?: string
          tipo?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          gateway_id: string | null
          gateway_provider: string | null
          gateway_url: string | null
          id: string
          matricula_id: string
          observacoes: string | null
          referencia: string | null
          status: Database["public"]["Enums"]["status_pagamento"]
          ultimo_aviso_data: string | null
          ultimo_lembrete: string | null
          unidade_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          gateway_id?: string | null
          gateway_provider?: string | null
          gateway_url?: string | null
          id?: string
          matricula_id: string
          observacoes?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          ultimo_aviso_data?: string | null
          ultimo_lembrete?: string | null
          unidade_id?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          gateway_id?: string | null
          gateway_provider?: string | null
          gateway_url?: string | null
          id?: string
          matricula_id?: string
          observacoes?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          ultimo_aviso_data?: string | null
          ultimo_lembrete?: string | null
          unidade_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      presencas: {
        Row: {
          created_at: string
          data: string
          id: string
          matricula_id: string
          observacao: string | null
          presente: boolean
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          matricula_id: string
          observacao?: string | null
          presente: boolean
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          matricula_id?: string
          observacao?: string | null
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "presencas_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          ativo: boolean
          created_at: string
          especialidade: string | null
          id: string
          is_volunteer: boolean
          percentual_comissao: number
          tipo_contrato: string | null
          updated_at: string
          user_id: string
          valor_fixo: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          especialidade?: string | null
          id?: string
          is_volunteer?: boolean
          percentual_comissao?: number
          tipo_contrato?: string | null
          updated_at?: string
          user_id: string
          valor_fixo?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          especialidade?: string | null
          id?: string
          is_volunteer?: boolean
          percentual_comissao?: number
          tipo_contrato?: string | null
          updated_at?: string
          user_id?: string
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          codigo_indicacao: string | null
          convidado_por: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          id: string
          nivel_ensino: string | null
          nome_completo: string
          profissao: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          codigo_indicacao?: string | null
          convidado_por?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          id: string
          nivel_ensino?: string | null
          nome_completo: string
          profissao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          codigo_indicacao?: string | null
          convidado_por?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          id?: string
          nivel_ensino?: string | null
          nome_completo?: string
          profissao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_convidado_por_fkey"
            columns: ["convidado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_matricula: {
        Row: {
          atividade_desejada: string | null
          autoriza_imagem: boolean | null
          como_conheceu: string | null
          cpf_responsavel: string | null
          created_at: string | null
          data_nascimento: string
          escola: string | null
          id: string
          necessidades_especiais: string | null
          nome_completo: string
          serie_ano: string | null
          sobrenome: string | null
          status: Database["public"]["Enums"]["status_solicitacao"] | null
          unidade_id: string
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          atividade_desejada?: string | null
          autoriza_imagem?: boolean | null
          como_conheceu?: string | null
          cpf_responsavel?: string | null
          created_at?: string | null
          data_nascimento: string
          escola?: string | null
          id?: string
          necessidades_especiais?: string | null
          nome_completo: string
          serie_ano?: string | null
          sobrenome?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"] | null
          unidade_id: string
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          atividade_desejada?: string | null
          autoriza_imagem?: boolean | null
          como_conheceu?: string | null
          cpf_responsavel?: string | null
          created_at?: string | null
          data_nascimento?: string
          escola?: string | null
          id?: string
          necessidades_especiais?: string | null
          nome_completo?: string
          serie_ano?: string | null
          sobrenome?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao"] | null
          unidade_id?: string
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_matricula_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ativa: boolean
          atividade_id: string
          capacidade_maxima: number
          created_at: string
          dias_semana: string[]
          horario: string
          id: string
          nome: string
          professor_id: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          atividade_id: string
          capacidade_maxima?: number
          created_at?: string
          dias_semana: string[]
          horario: string
          id?: string
          nome: string
          professor_id?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          atividade_id?: string
          capacidade_maxima?: number
          created_at?: string
          dias_semana?: string[]
          horario?: string
          id?: string
          nome?: string
          professor_id?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nome: string
          slug: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          slug?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          slug?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unidades: {
        Row: {
          created_at: string | null
          id: string
          role: string
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      alunos_secure: {
        Row: {
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          endereco: string | null
          id: string | null
          nome_completo: string | null
          responsavel_id: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cpf?: never
          created_at?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          id?: string | null
          nome_completo?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf?: never
          created_at?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          id?: string | null
          nome_completo?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      gerar_pagamentos_mensais: { Args: never; Returns: Json }
      get_aluno_cpf: {
        Args: { aluno_id: string; cpf_value: string }
        Returns: string
      }
      get_aluno_responsavel_id: {
        Args: { p_aluno_id: string }
        Returns: string
      }
      get_alunos_by_responsavel: {
        Args: { p_responsavel_id: string }
        Returns: string[]
      }
      get_financial_kpis:
        | { Args: { month_ref: string }; Returns: Json }
        | { Args: { month_ref: string; p_unidade_id?: string }; Returns: Json }
      get_monthly_revenue:
        | {
            Args: { year_ref: number }
            Returns: {
              despesa: number
              mes: string
              receita: number
            }[]
          }
        | {
            Args: { p_unidade_id?: string; year_ref: number }
            Returns: {
              despesa: number
              mes: string
              receita: number
            }[]
          }
      get_receita_por_atividade:
        | {
            Args: never
            Returns: {
              nome: string
              valor: number
            }[]
          }
        | {
            Args: { p_unidade_id?: string }
            Returns: {
              nome: string
              valor: number
            }[]
          }
      get_turma_vagas: {
        Args: { p_turma_id: string }
        Returns: {
          capacidade_maxima: number
          matriculas_ativas: number
          vagas_disponiveis: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coordenador_atividade: {
        Args: { _atividade_id: string; _user_id: string }
        Returns: boolean
      }
      is_coordenador_turma: {
        Args: { _turma_id: string; _user_id: string }
        Returns: boolean
      }
      is_professor_aluno: {
        Args: { p_aluno_id: string; p_user_id: string }
        Returns: boolean
      }
      mask_cpf: { Args: { cpf_value: string }; Returns: string }
      validate_cpf: { Args: { p_cpf: string }; Returns: boolean }
      validate_invitation_token: {
        Args: { _email: string; _token: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      validate_recovery_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "direcao"
        | "coordenacao"
        | "professor"
        | "responsavel"
        | "secretaria"
      status_certificado: "emitido" | "revogado"
      status_matricula: "pendente" | "ativa" | "cancelada" | "concluida"
      status_pagamento: "pendente" | "pago" | "atrasado" | "cancelado"
      status_solicitacao: "pendente" | "aprovada" | "rejeitada" | "interessado"
      tipo_contato:
        | "ligacao"
        | "whatsapp"
        | "email"
        | "reuniao"
        | "cobranca"
        | "outro"
      tipo_contrato_professor: "parceiro" | "fixo" | "voluntario"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "direcao",
        "coordenacao",
        "professor",
        "responsavel",
        "secretaria",
      ],
      status_certificado: ["emitido", "revogado"],
      status_matricula: ["pendente", "ativa", "cancelada", "concluida"],
      status_pagamento: ["pendente", "pago", "atrasado", "cancelado"],
      status_solicitacao: ["pendente", "aprovada", "rejeitada", "interessado"],
      tipo_contato: [
        "ligacao",
        "whatsapp",
        "email",
        "reuniao",
        "cobranca",
        "outro",
      ],
      tipo_contrato_professor: ["parceiro", "fixo", "voluntario"],
    },
  },
} as const
