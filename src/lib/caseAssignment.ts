import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-assigns a submitted case to an available professional based on category and specialty.
 * Returns the assigned professional's user_id or null if no suitable professional is found.
 */
export async function autoAssignProfessional(
  caseId: string,
  category: 'medical' | 'wellness'
): Promise<string | null> {
  try {
    // Determine the role we're looking for
    const requiredRole = category === 'medical' ? 'doctor' : 'advisor';

    // First, try to find a professional with matching specialty who is available and verified
    const { data: matchingProfiles, error: profileError } = await supabase
      .from('doctor_profiles')
      .select('user_id, specialty')
      .eq('is_verified', true)
      .eq('availability_status', 'available')
      .limit(10);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return null;
    }

    if (!matchingProfiles || matchingProfiles.length === 0) {
      console.log('No available professionals found');
      return null;
    }

    // Filter professionals by role
    const professionalIds = matchingProfiles.map(p => p.user_id);
    
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', requiredRole)
      .in('user_id', professionalIds);

    if (roleError || !roleData || roleData.length === 0) {
      console.log('No professionals with required role found');
      return null;
    }

    // Get professionals who have the required role
    const eligibleProfessionalIds = roleData.map(r => r.user_id);

    // Check for duplicate assignment - exclude professionals already assigned to this case's user
    const { data: caseData } = await supabase
      .from('submitted_cases')
      .select('user_id')
      .eq('id', caseId)
      .single();

    if (!caseData) {
      console.error('Case not found');
      return null;
    }

    // Find professionals not already assigned to pending cases from the same user
    const { data: existingAssignments } = await supabase
      .from('submitted_cases')
      .select('assigned_professional_id')
      .eq('user_id', caseData.user_id)
      .eq('status', 'pending_review')
      .not('assigned_professional_id', 'is', null);

    const alreadyAssignedIds = existingAssignments?.map(a => a.assigned_professional_id) || [];

    // Filter out already assigned professionals
    const availableProfessionals = eligibleProfessionalIds.filter(
      id => !alreadyAssignedIds.includes(id)
    );

    if (availableProfessionals.length === 0) {
      // If all are assigned, just pick any eligible professional
      const selectedProfessional = eligibleProfessionalIds[0];
      
      // Update the case with the assignment
      await supabase
        .from('submitted_cases')
        .update({ assigned_professional_id: selectedProfessional })
        .eq('id', caseId);

      return selectedProfessional;
    }

    // Select the first available professional
    const selectedProfessional = availableProfessionals[0];

    // Update the case with the assignment
    const { error: updateError } = await supabase
      .from('submitted_cases')
      .update({ assigned_professional_id: selectedProfessional })
      .eq('id', caseId);

    if (updateError) {
      console.error('Error assigning professional:', updateError);
      return null;
    }

    return selectedProfessional;
  } catch (error) {
    console.error('Error in autoAssignProfessional:', error);
    return null;
  }
}
