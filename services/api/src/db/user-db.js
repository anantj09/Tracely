const supabase = require('./supabase-client');

/**
 * Retrieve a user record by Firebase UID (for backward compatibility).
 * @param {string} firebaseUid
 * @returns {Promise<Object|null>} user row or null
 */
async function getUserByFirebaseUid(firebaseUid) {
  try {
    if (!firebaseUid) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getUserByFirebaseUid:', error);
    throw error;
  }
}

/**
 * Retrieve a user record by Supabase Auth UID.
 * @param {string} supabaseAuthUid
 * @returns {Promise<Object|null>} user row or null
 */
async function getUserBySupabaseUid(supabaseAuthUid) {
  try {
    if (!supabaseAuthUid) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_auth_uid', supabaseAuthUid)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getUserBySupabaseUid:', error);
    throw error;
  }
}

/**
 * Retrieve a user record by interior database UUID.
 * @param {string} userId
 * @returns {Promise<Object|null>} user row or null
 */
async function getUserById(userId) {
  try {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
}

/**
 * Insert a new user record.
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.supabase_auth_uid
 * @returns {Promise<Object>} the newly created user row
 */
async function createUser({ phone, supabase_auth_uid }) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        phone,
        supabase_auth_uid,
        is_verified: false
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

/**
 * Update allowed fields of a user record.
 * @param {string} userId
 * @param {Object} fields
 * @returns {Promise<Object>} the updated user row
 */
async function updateUser(userId, fields) {
  try {
    // Whitelist update fields for user profiles
    const allowedFields = [
      'name',
      'emergency_contacts',
      'preferred_class',
      'frequent_routes',
      'is_verified',
      'age',
      'gender'
    ];
    const updateData = {
      updated_at: new Date().toISOString()
    };

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field];
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

module.exports = {
  getUserByFirebaseUid, // keep for backward compat
  getUserBySupabaseUid, // new
  getUserById,
  createUser,
  updateUser
};
