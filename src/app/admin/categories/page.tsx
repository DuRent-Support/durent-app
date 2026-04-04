import { MasterDataCrudPage } from "@/components/admin/MasterDataCrudPage";

export default function AdminCategoriesPage() {
  return (
    <MasterDataCrudPage
      title="Kelola Categories"
      description="Tambah, edit, atau hapus kategori utama untuk pengelompokan item."
      endpoint="/api/admin/categories"
      entityLabel="Category"
    />
  );
}
