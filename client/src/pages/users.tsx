import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AddUserDialog from "@/components/user/add-user-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, UserCircle, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/users", { page: currentPage, limit: pageSize, search: searchQuery }],
  });

  const users = data?.users || [];
  const totalUsers = data?.total || 0;
  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">User Management</h1>
            <Button onClick={() => setIsAddUserOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all_departments">
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_departments">All Departments</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-neutral-200">
              <CardTitle>Registered Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Biometric</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found. Add a new user to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center mr-2">
                                  <UserCircle className="h-5 w-5 text-neutral-500" />
                                </div>
                                <div>
                                  <div className="font-medium">{`${user.firstName} ${user.lastName}`}</div>
                                  <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.employeeId}</TableCell>
                            <TableCell>{user.department || "—"}</TableCell>
                            <TableCell>{user.position || "—"}</TableCell>
                            <TableCell>
                              {user.active ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-error/10 text-error border-error/20">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.biometricId ? (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  Registered
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-neutral-100 text-neutral-500">
                                  Not Registered
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <UserCog className="h-4 w-4" />
                                <span className="sr-only">Edit user</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-neutral-200">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                              }} 
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: totalPages }).map((_, index) => (
                            <PaginationItem key={index}>
                              <PaginationLink
                                href="#"
                                isActive={currentPage === index + 1}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(index + 1);
                                }}
                              >
                                {index + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          
                          <PaginationItem>
                            <PaginationNext 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <AddUserDialog 
            open={isAddUserOpen} 
            onClose={() => setIsAddUserOpen(false)}
            onUserAdded={() => {
              refetch();
              setIsAddUserOpen(false);
            }}
          />
        </div>
      </main>
    </div>
  );
}
