import { UserModel, type UserDocument } from "./auth.model.js";

export const authRepository = {
  findByEmail(email: string, withSecrets = false) {
    const query = UserModel.findOne({ email });
    return withSecrets
      ? query.select("+passwordHash +emailVerificationCodeHash +emailVerificationExpiresAt +refreshTokenVersion")
      : query;
  },

  findById(id: string) {
    return UserModel.findById(id);
  },

  create(data: Pick<UserDocument, "email" | "passwordHash" | "locale">) {
    return UserModel.create(data);
  },

  async save(user: UserDocument) {
    await user.save();
    return user;
  },
};
