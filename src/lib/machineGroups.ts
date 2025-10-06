import { supabase } from './supabase';
import type { MachineGroup } from '../types/machine';

export async function getMachineGroups(): Promise<MachineGroup[]> {
  try {
    const { data, error } = await supabase
      .from('grupos_maquinas')
      .select('*')
      .order('descricao');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching machine groups:', err);
    return [];
  }
}

export async function getMachineGroup(machineId: number): Promise<MachineGroup | null> {
  try {
    const { data, error } = await supabase
      .from('Maquinas')
      .select(`
        grupo_maquina,
        grupos_maquinas (
          id,
          descricao,
          id_empresa
        )
      `)
      .eq('id_maquina', machineId)
      .single();

    if (error) throw error;
    return data?.grupos_maquinas || null;
  } catch (err) {
    console.error('Error fetching machine group:', err);
    return null;
  }
}

export async function assignMachineToGroup(machineId: number, groupId: number | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('Maquinas')
      .update({ grupo_maquina: groupId })
      .eq('id_maquina', machineId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error assigning machine to group:', err);
    return false;
  }
}

export async function createMachineGroup(group: Omit<MachineGroup, 'id'>): Promise<MachineGroup | null> {
  try {
    const { data, error } = await supabase
      .from('grupos_maquinas')
      .insert(group)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error creating machine group:', err);
    return null;
  }
} 