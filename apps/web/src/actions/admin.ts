export const admins = ['tymon42@outlook.com', 'cunkycheng@gmail.com'];

export const isAdmin = (email: string) => {
  return admins.includes(email);
};
