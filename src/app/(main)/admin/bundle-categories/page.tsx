import { MasterDataCrudPage } from "@/components/admin/MasterDataCrudPage";

export default function AdminBundleCategoriesPage() {
  return (
    <MasterDataCrudPage
      title="Kelola Bundle Categories"
      description="Tambah, edit, atau hapus kategori bundle untuk mempermudah manajemen paket."
      endpoint="/api/admin/bundle-categories"
      entityLabel="Bundle Category"
    />
  );
}
